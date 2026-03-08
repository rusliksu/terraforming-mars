import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {ActionLogger} from '../ActionLogger';

export class ApiGameReplay extends Handler {
  public static readonly INSTANCE = new ApiGameReplay();

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const gameId = ctx.url.searchParams.get('id');
    if (gameId === null) {
      responses.badRequest(req, res, 'missing id parameter');
      return;
    }

    const generation = ctx.url.searchParams.get('generation');
    let entries = ActionLogger.getGameLog(gameId);

    if (generation !== null) {
      const gen = parseInt(generation);
      entries = entries.filter((e) => e.generation === gen);
    }

    // Group by generation
    const byGeneration: Record<number, typeof entries> = {};
    for (const entry of entries) {
      if (!byGeneration[entry.generation]) {
        byGeneration[entry.generation] = [];
      }
      byGeneration[entry.generation].push(entry);
    }

    const result = {
      gameId,
      totalEntries: entries.length,
      generations: Object.keys(byGeneration).map((gen) => ({
        generation: parseInt(gen),
        actions: byGeneration[parseInt(gen)],
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  }
}
