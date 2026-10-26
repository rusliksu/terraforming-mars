import {Handler} from './Handler';
import {Request} from '../Request';
import {Response} from '../Response';
import {Context} from './IHandler';
import {RouteError} from './RouteError';
import {isGameId} from '../../common/Types';
import * as responses from '../server/responses';

/**
 * Admin: deletes a game from the database and forgets its in-memory copy.
 * Requires the server id, like the other admin endpoints.
 */
export class ApiDeleteGame extends Handler {
  public static readonly INSTANCE = new ApiDeleteGame();

  constructor() {
    super({validateServerId: true});
  }

  public override async delete(_req: Request, res: Response, ctx: Context): Promise<void> {
    const id = ctx.url.searchParams.get('id');
    if (id === null || !isGameId(id)) {
      throw RouteError.badRequest('Invalid game id');
    }
    if (await ctx.gameLoader.getGame(id) === undefined) {
      throw RouteError.notFound('Game not found');
    }
    await ctx.gameLoader.deleteGame(id);
    // Admin deletions are rare and destructive: keep an audit line in the server log.
    console.log(`Game ${id} deleted from the database by an admin request`);
    responses.writeJson(res, ctx, {deleted: id});
  }
}
