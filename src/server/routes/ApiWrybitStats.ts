import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {projectWrybitUiStats, WrybitUiStatsSnapshot} from '../../common/models/WrybitUiStats';
import {Request} from '../Request';
import {Response} from '../Response';
import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';

// Public, read-only statistics. The repository already ships a public ELO history used by /elo;
// expose only the explicitly selected fields from that file. No database/admin data is read here.
export class ApiWrybitStats extends Handler {
  public static readonly INSTANCE = new ApiWrybitStats();
  private constructor() {
    super();
  }

  public override async get(_req: Request, res: Response, ctx: Context): Promise<void> {
    let snapshot: WrybitUiStatsSnapshot = {projectionVersion: 1, source: 'elo', games: []};
    try {
      const raw = await readFile(path.resolve(process.cwd(), 'assets/elo/elo-data.json'), 'utf8');
      snapshot = projectWrybitUiStats(JSON.parse(raw));
    } catch (err) {
      // A missing/not-yet-generated public history is an empty statistics page, not a server error.
      if ((err as {code?: string}).code !== 'ENOENT') {
        console.warn('Could not read public ELO statistics', err);
      }
    }
    responses.writeJson(res, ctx, snapshot);
  }
}
