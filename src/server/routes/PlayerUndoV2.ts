import {MAX_ACTION_REQUEST_BYTES} from '../../common/actionProtocol/ActionProtocol';
import {bootstrapActionGatewayFromEnv} from '../actionGateway';
import * as responses from '../server/responses';
import {
  readRequestBody,
  rejected,
  resolveActionV2Bootstrap,
  writeActionJson,
} from './ActionV2RouteSupport';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';

const STATUS = {
  payloadTooLarge: 413,
  internalServerError: 500,
  serviceUnavailable: 503,
} as const;

export type PlayerUndoV2Options = {
  /** Bootstrap seam for tests; production reads server-side configuration only. */
  bootstrap?: () => ReturnType<typeof bootstrapActionGatewayFromEnv>;
};

/**
 * POST /player/undo/v2
 *
 * Append-only undo. The journal keeps every accepted action; the undo appends
 * one intent that reverts the effect. The legacy destructive restoreGameAt path
 * is never used for v2 games.
 */
export class PlayerUndoV2 extends Handler {
  public static readonly INSTANCE = new PlayerUndoV2();

  private readonly bootstrapFactory: () => ReturnType<typeof bootstrapActionGatewayFromEnv>;

  public constructor(options: PlayerUndoV2Options = {}) {
    super();
    this.bootstrapFactory = options.bootstrap ?? bootstrapActionGatewayFromEnv;
  }

  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    const bootstrap = resolveActionV2Bootstrap(this.bootstrapFactory);
    if (bootstrap.kind === 'disabled') {
      responses.notFound(req, res);
      return;
    }
    if (bootstrap.kind === 'unavailable') {
      writeActionJson(res, STATUS.serviceUnavailable, rejected('PERSISTENCE_FAILURE', true));
      return;
    }

    const gateway = bootstrap.gateway;
    // Attach body listeners before the first await so no client chunk is lost.
    const bodyPromise = readRequestBody(req, MAX_ACTION_REQUEST_BYTES);
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
      const result = await gateway.handleUndo({
        principal: ctx.user,
        rawBody: body.body,
        games: {getGame: (gameId) => ctx.gameLoader.getGame(gameId)},
      });
      writeActionJson(res, result.statusCode, result.body);
    } catch (err) {
      console.warn('v2 undo failed', err instanceof Error ? err.name : 'unknown');
      writeActionJson(res, STATUS.internalServerError, rejected('PERSISTENCE_FAILURE', true));
    }
  }
}
