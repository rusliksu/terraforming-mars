import * as responses from '../server/responses';
import {Server} from '../models/ServerModel';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {getUserAgent} from './auditRequest';
import {RouteError} from './RouteError';

export class ApiSpectator extends Handler {
  public static readonly INSTANCE = new ApiSpectator();

  private constructor() {
    super();
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const id = ctx.urlParams.spectatorId('id');
    const game = await ctx.gameLoader.getGame(id);
    if (game === undefined) {
      throw RouteError.notFound();
    }
    ctx.accessAudit.record({
      event: 'spectator_view',
      method: req.method ?? '',
      path: 'api/spectator',
      gameId: game.id,
      participantId: game.spectatorId,
      participantKind: 'spectator',
      clientIp: ctx.clientIp,
      userAgent: getUserAgent(req),
      metadata: {
        privateHandsVisible: false,
      },
    });
    responses.writeJson(res, ctx, Server.getSpectatorModel(game));
  }
}
