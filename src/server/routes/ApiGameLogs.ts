import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {GameLogs} from './GameLogs';
import {Request} from '../Request';
import {Response} from '../Response';

export class ApiGameLogs extends Handler {
  public static readonly INSTANCE = new ApiGameLogs();
  private constructor(private gameLogs = new GameLogs()) {
    super();
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const searchParams = ctx.url.searchParams;
    const id = ctx.urlParams.participantId('id');
    const game = await ctx.gameLoader.getGame(id);
    if (game === undefined) {
      responses.notFound(req, res, 'game not found');
      return;
    }

    if (searchParams.get('full') !== null) {
      let logs = '';
      try {
        logs = this.gameLogs.getLogsForGameEnd(game).join('\n');
      } catch (e) {
        responses.badRequest(req, res, 'cannot fetch game-end log');
        return;
      }
      res.setHeader('Content-Type', 'text/plain');
      res.end(logs);
    } else {
      const generation = searchParams.get('generation');
      const limit = searchParams.get('limit');
      const logs = this.gameLogs.getLogsForGameView(id, game, generation, limit);
      responses.writeJson(res, ctx, logs);
    }
  }
}
