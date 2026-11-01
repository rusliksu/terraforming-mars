import {readFile} from 'node:fs/promises';
import {projectWrybitUiStats, WrybitUiStatsSnapshot} from '../../common/models/WrybitUiStats';
import {getEloMirrorPath} from '../elo/EloPaths';
import {Request} from '../Request';
import {Response} from '../Response';
import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';

// Public, read-only statistics. Reads the same live ELO history the /elo page serves (ELO_DATA_DIR,
// shared between releases); a snapshot committed into the build must never win over live numbers.
// Only explicitly selected fields are exposed. No database/admin data is read here.
export class ApiWrybitStats extends Handler {
  public static readonly INSTANCE = new ApiWrybitStats();
  private constructor() {
    super();
  }

  public override async get(_req: Request, res: Response, ctx: Context): Promise<void> {
    let snapshot: WrybitUiStatsSnapshot = {projectionVersion: 1, source: 'elo', games: [], ratings: []};
    try {
      const raw = await readFile(getEloMirrorPath(), 'utf8');
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
