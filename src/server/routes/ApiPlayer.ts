import * as responses from '../server/responses';
import {Server} from '../models/ServerModel';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {getUserAgent} from './auditRequest';
import {RouteError} from './RouteError';
import {IPlayer} from '../IPlayer';
import {IGame} from '../IGame';

export class ApiPlayer extends Handler {
  public static readonly INSTANCE = new ApiPlayer();

  private constructor() {
    super();
  }

  private recordDeniedView(req: Request, ctx: Context, game: IGame, player: IPlayer): void {
    ctx.accessAudit.record({
      event: 'player_view_denied',
      method: req.method ?? '',
      path: 'api/player',
      gameId: game.id,
      participantId: player.id,
      participantKind: 'player',
      clientIp: ctx.clientIp,
      userAgent: getUserAgent(req),
    });
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const playerId = ctx.urlParams.playerId('id');
    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      throw RouteError.notFound();
    }
    let player: IPlayer;
    try {
      player = game.getPlayerById(playerId);
    } catch (err) {
      console.warn(`unable to find player ${playerId}`, err);
      throw RouteError.notFound();
    }
    const serverIdAccess = this.hasServerIdAccess(ctx);
    if (player.user !== undefined && ctx.user === undefined && !serverIdAccess) {
      this.recordDeniedView(req, ctx, game, player);
      responses.unauthorized(req, res);
      return;
    }
    if (!this.isUser(player.user, ctx) && !serverIdAccess) {
      this.recordDeniedView(req, ctx, game, player);
      responses.notAuthorized(req, res);
      return;
    }

    ctx.ipTracker.addParticipant(playerId, ctx.ip);
    ctx.accessAudit.record({
      event: 'player_view',
      method: req.method ?? '',
      path: 'api/player',
      gameId: game.id,
      participantId: playerId,
      participantKind: 'player',
      clientIp: ctx.clientIp,
      userAgent: getUserAgent(req),
    });
    responses.writeJson(res, ctx, Server.getPlayerModel(player));
  }
}
