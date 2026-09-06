import {Handler} from './Handler';
import {Context} from './IHandler';
import {RouteError} from './RouteError';
import {Request} from '@/server/Request';
import {Response} from '@/server/Response';
import {Database} from '@/server/database/Database';
import {IDatabase} from '@/server/database/IDatabase';
import {GameId, SpectatorId} from '@/common/Types';
import {Phase} from '@/common/Phase';
import {ReplayFrame, ReplayIndex} from '@/common/models/ReplayModel';
import {toReplayFrame} from '@/server/replay/ReplayFrame';

export class ApiReplay extends Handler {
  public static readonly INSTANCE = new ApiReplay();
  private static readonly MAX_CONCURRENT = 4;
  private static readonly MAX_SAVES = 4096;
  private static readonly MAX_FRAME_BYTES = 8 * 1024 * 1024;
  private active = 0;

  private constructor() {
    super();
  }

  public override async processRequest(req: Request, res: Response, ctx: Context): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    await super.processRequest(req, res, ctx);
  }

  public override async get(_req: Request, res: Response, ctx: Context): Promise<void> {
    const spectatorId = ctx.urlParams.spectatorId('id');
    const value = ctx.urlParams.stringOrUndefined('saveId');
    if (spectatorId.length > 64 || (value !== undefined && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))))) {
      throw RouteError.badRequest('Invalid replay request');
    }
    if (this.active >= ApiReplay.MAX_CONCURRENT) {
      res.setHeader('Retry-After', '1');
      res.writeHead(429);
      res.end('Replay busy');
      return;
    }
    this.active++;
    try {
      const db = Database.getInstance();
      // The ledger avoids scanning historical game JSON for unknown capabilities.
      const entry = (await db.getParticipants()).find((entry) => entry.participantIds.includes(spectatorId));
      if (entry === undefined) {
        throw RouteError.notFound('Replay unavailable');
      }
      const latest = await this.completed(db, entry.gameId, spectatorId);
      const saveIds = await db.getSaveIds(entry.gameId);
      if (saveIds.length === 0 || saveIds.length > ApiReplay.MAX_SAVES || saveIds.some((id) => !Number.isSafeInteger(id) || id < 0)) {
        throw new Error('Invalid replay index');
      }
      const orderedIds = Array.from(new Set(saveIds)).sort((a, b) => a - b);
      let result: ReplayFrame | ReplayIndex;
      if (value === undefined) {
        result = {name: latest.name, spectatorId, saveIds: orderedIds};
      } else {
        const saveId = Number(value);
        if (!orderedIds.includes(saveId)) {
          throw RouteError.notFound('Save unavailable');
        }
        const saved = await db.getGameVersion(entry.gameId, saveId);
        if (saved.id !== entry.gameId || saved.lastSaveId !== saveId || saved.spectatorId !== spectatorId ||
          Buffer.byteLength(JSON.stringify(saved)) > ApiReplay.MAX_FRAME_BYTES) {
          throw new Error('Invalid replay frame');
        }
        result = toReplayFrame(saved);
      }
      await this.completed(db, entry.gameId, spectatorId);
      const json = JSON.stringify(result);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Length', String(Buffer.byteLength(json)));
      res.end(json);
    } catch (error) {
      if (error instanceof RouteError) {
        throw error;
      }
      throw RouteError.internalServerError('Replay unavailable');
    } finally {
      this.active--;
    }
  }

  private async completed(db: IDatabase, gameId: GameId, spectatorId: SpectatorId) {
    const latest = await db.getGame(gameId);
    if (latest.id !== gameId || latest.spectatorId !== spectatorId || latest.phase !== Phase.END) {
      throw RouteError.notFound('Replay unavailable');
    }
    return latest;
  }
}
