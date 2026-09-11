import * as responses from '../server/responses';
import {Server} from '../models/ServerModel';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {getUserAgent} from './auditRequest';
import {RouteError} from './RouteError';

export class ApiPlayer extends Handler {
  public static readonly INSTANCE = new ApiPlayer();

  private constructor() {
    super();
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const playerId = ctx.urlParams.playerId('id');
    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      throw RouteError.notFound();
    }
    try {
      const player = game.getPlayerById(playerId);
      if (!this.isUser(player.user, ctx) && !this.hasServerIdAccess(ctx)) {
        ctx.accessAudit.record({
          event: 'player_view_denied',
          method: req.method ?? '',
          path: 'api/player',
          gameId: game.id,
          participantId: playerId,
          participantKind: 'player',
          clientIp: ctx.clientIp,
          userAgent: getUserAgent(req),
        });
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
    } catch (err) {
      console.warn(`unable to find player ${playerId}`, err);
      throw RouteError.notFound();
    }
  }
}
