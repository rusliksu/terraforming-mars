import {isPlayerId} from '../../common/Types';
import {bootstrapActionGatewayFromEnv} from '../actionGateway';
import {IPlayer} from '../IPlayer';
import * as responses from '../server/responses';
import {
  rejected,
  resolveActionV2Bootstrap,
  writeActionJson,
} from './ActionV2RouteSupport';
import {getUserAgent} from './auditRequest';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';

const STATUS = {
  internalServerError: 500,
  serviceUnavailable: 503,
} as const;

export type PlayerBootstrapV2Options = {
  /** Bootstrap seam for tests; production reads server-side configuration only. */
  bootstrap?: () => ReturnType<typeof bootstrapActionGatewayFromEnv>;
};

/**
 * GET /player/input/v2/bootstrap?id=<playerId>
 *
 * Full authorized resync for the v2 client: current journal revision, the
 * server-issued prompt token, the engine identity, and the actor-scoped view.
 * C2 must never synthesize any of these values itself.
 */
export class PlayerBootstrapV2 extends Handler {
  public static readonly INSTANCE = new PlayerBootstrapV2();

  private readonly bootstrapFactory: () => ReturnType<typeof bootstrapActionGatewayFromEnv>;

  public constructor(options: PlayerBootstrapV2Options = {}) {
    super();
    this.bootstrapFactory = options.bootstrap ?? bootstrapActionGatewayFromEnv;
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const playerId = ctx.url.searchParams.get('id');
    if (playerId === null) {
      responses.badRequest(req, res, 'missing id parameter');
      return;
    }
    if (!isPlayerId(playerId)) {
      responses.badRequest(req, res, 'invalid player id');
      return;
    }
    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      responses.notFound(req, res);
      return;
    }
    let player: IPlayer;
    try {
      player = game.getPlayerById(playerId);
    } catch (_err) {
      responses.notFound(req, res);
      return;
    }
    if (!this.isUser(player.user, ctx) && !this.hasServerIdAccess(ctx)) {
      ctx.accessAudit.record({
        event: 'player_view_denied',
        method: req.method ?? '',
        path: 'player/input/v2/bootstrap',
        gameId: game.id,
        participantId: playerId,
        participantKind: 'player',
        clientIp: ctx.clientIp,
        userAgent: getUserAgent(req),
      });
      responses.notAuthorized(req, res);
      return;
    }

    const bootstrap = resolveActionV2Bootstrap(this.bootstrapFactory);
    if (bootstrap.kind === 'disabled') {
      responses.notFound(req, res);
      return;
    }
    if (bootstrap.kind === 'unavailable') {
      writeActionJson(res, STATUS.serviceUnavailable, rejected('PERSISTENCE_FAILURE', true));
      return;
    }

    try {
      await bootstrap.gateway.initialize();
      const result = await bootstrap.gateway.bootstrap({
        principal: ctx.user,
        game,
        actorId: playerId,
      });
      writeActionJson(res, result.statusCode, result.body);
    } catch (err) {
      // Never expose a stack, SQL, or private state to the client.
      console.warn('v2 bootstrap failed', err instanceof Error ? err.name : 'unknown');
      writeActionJson(res, STATUS.internalServerError, rejected('PERSISTENCE_FAILURE', true));
    }
  }
}
