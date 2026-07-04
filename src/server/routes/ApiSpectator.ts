import * as responses from '../server/responses';
import {Server} from '../models/ServerModel';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {IGame} from '../IGame';
import {isSpectatorId} from '../../common/Types';
import {Request} from '../Request';
import {Response} from '../Response';
import {getUserAgent} from './auditRequest';

export class ApiSpectator extends Handler {
  public static readonly INSTANCE = new ApiSpectator();

  private constructor() {
    super();
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const id = ctx.url.searchParams.get('id');
    if (!id) {
      responses.badRequest(req, res, 'invalid id');
      return;
    }
    let game: IGame | undefined;
    if (isSpectatorId(id)) {
      game = await ctx.gameLoader.getGame(id);
    }
    if (game === undefined) {
      responses.notFound(req, res);
      return;
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
