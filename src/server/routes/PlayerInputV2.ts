import {ACTION_SCHEMA_VERSION, ActionErrorCode, ActionErrorResponseV1, ActionResponseV1, MAX_ACTION_REQUEST_BYTES} from '../../common/actionProtocol/ActionProtocol';
import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {ActionGateway, ActionGatewayBootstrap, bootstrapActionGatewayFromEnv} from '../actionGateway';

const STATUS = {
  payloadTooLarge: 413,
  internalServerError: 500,
  serviceUnavailable: 503,
} as const;

export type PlayerInputV2Options = {
  /** Bootstrap seam for tests; production reads server-side configuration only. */
  bootstrap?: () => ActionGatewayBootstrap;
};

type BodyReadResult =
  | {ok: true; body: string}
  | {ok: false; tooLarge: true};

function readBody(req: Request, limit: number): Promise<BodyReadResult> {
  return new Promise((resolve) => {
    const chunks: Array<Buffer> = [];
    let bytes = 0;
    let tooLarge = false;
    req.on('data', (chunk: Buffer) => {
      if (tooLarge) {
        return;
      }
      bytes += chunk.length;
      if (bytes > limit) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.once('end', () => {
      if (tooLarge) {
        resolve({ok: false, tooLarge: true});
        return;
      }
      resolve({ok: true, body: Buffer.concat(chunks).toString('utf8')});
    });
  });
}

function rejected(code: ActionErrorCode, retryable?: boolean): ActionErrorResponseV1 {
  const body: ActionErrorResponseV1 = {
    v: ACTION_SCHEMA_VERSION,
    status: 'rejected',
    code,
  };
  if (retryable !== undefined) {
    body.retryable = retryable;
  }
  return body;
}

function writeActionJson(res: Response, statusCode: number, body: ActionResponseV1): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(statusCode);
  res.end(JSON.stringify(body));
}

/**
 * POST /player/input/v2
 *
 * Additive route. Default configuration is disabled and answers 404; a missing
 * engine adapter or durable journal answers 503. The handler performs its own
 * authentication from ctx.user and never delegates to the legacy route.
 */
export class PlayerInputV2 extends Handler {
  public static readonly INSTANCE = new PlayerInputV2();

  private readonly bootstrap: () => ActionGatewayBootstrap;

  public constructor(options: PlayerInputV2Options = {}) {
    super();
    this.bootstrap = options.bootstrap ?? bootstrapActionGatewayFromEnv;
  }

  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    let bootstrap: ActionGatewayBootstrap;
    try {
      bootstrap = this.bootstrap();
    } catch (_err) {
      bootstrap = {kind: 'unavailable'};
    }
    if (bootstrap.kind === 'disabled') {
      responses.notFound(req, res);
      return;
    }
    if (bootstrap.kind === 'unavailable') {
      writeActionJson(res, STATUS.serviceUnavailable, rejected('PERSISTENCE_FAILURE', true));
      return;
    }

    const gateway: ActionGateway = bootstrap.gateway;
    // Attach body listeners before the first await so no client chunk is lost.
    const bodyPromise = readBody(req, MAX_ACTION_REQUEST_BYTES);
    try {
      await gateway.initialize();
    } catch (_err) {
      writeActionJson(res, STATUS.serviceUnavailable, rejected('PERSISTENCE_FAILURE', true));
      return;
    }

    const body = await bodyPromise;
    if (!body.ok) {
      writeActionJson(res, STATUS.payloadTooLarge, rejected('INVALID_SCHEMA'));
      return;
    }

    try {
      const result = await gateway.handle({
        principal: ctx.user,
        rawBody: body.body,
        games: {getGame: (gameId) => ctx.gameLoader.getGame(gameId)},
      });
      writeActionJson(res, result.statusCode, result.body);
    } catch (err) {
      // Never expose a stack, SQL, raw token, or private state to the client.
      console.warn('v2 action gateway failed', err instanceof Error ? err.name : 'unknown');
      writeActionJson(res, STATUS.internalServerError, rejected('PERSISTENCE_FAILURE', true));
    }
  }
}
