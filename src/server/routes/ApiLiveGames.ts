import * as responses from '../server/responses';
import {Phase} from '../../common/Phase';
import {LiveGameModel} from '../../common/models/LiveGameModel';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

function getLimit(rawLimit: string | null): number {
  if (rawLimit === null) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

export class ApiLiveGames extends Handler {
  public static readonly INSTANCE = new ApiLiveGames();

  private constructor() {
    super();
  }

  public override async get(_req: Request, res: Response, ctx: Context): Promise<void> {
    const limit = getLimit(ctx.url.searchParams.get('limit'));
    const now = Date.now();
    const list = await ctx.gameLoader.getIds();
    const liveGames: Array<LiveGameModel> = [];

    for (const entry of list) {
      if (liveGames.length >= limit) {
        break;
      }
      const game = await ctx.gameLoader.getGame(entry.gameId);
      if (game === undefined ||
          game.phase === Phase.END ||
          game.players.length < 2 ||
          game.expectedPurgeTimeMs() <= now) {
        continue;
      }
      liveGames.push({
        id: game.id,
        phase: game.phase,
        players: game.players.map((player) => ({
          color: player.color,
          name: player.name,
        })),
        spectatorId: game.spectatorId,
      });
    }

    responses.writeJson(res, ctx, liveGames);
  }
}
