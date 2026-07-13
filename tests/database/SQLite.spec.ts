import {describeDatabaseSuite} from './databaseSuite';
import {IGame} from '../../src/server/IGame';
import {IN_MEMORY_SQLITE_PATH, SQLite} from '../../src/server/database/SQLite';
import {GameId} from '../../src/common/Types';
import {RunResult} from 'better-sqlite3';
import {ITestDatabase, Status} from './ITestDatabase';
import {Game} from '../../src/server/Game';
import {GameLoader} from '../../src/server/database/GameLoader';
import {TestPlayer} from '../TestPlayer';
import {FakeClock} from '../common/FakeClock';
import {expect} from 'chai';

class TestSQLite extends SQLite implements ITestDatabase {
  public lastSaveGamePromise: Promise<void> = Promise.resolve();

  constructor() {
    super(IN_MEMORY_SQLITE_PATH, true);
  }

  public get database() {
    return this.db;
  }

  public override saveGame(game: IGame): Promise<void> {
    this.lastSaveGamePromise = super.saveGame(game);
    return this.lastSaveGamePromise;
  }

  public async status(gameId: GameId): Promise<Status> {
    const rows = await this.asyncAll('SELECT DISTINCT status FROM games WHERE game_id = ? ORDER BY save_id DESC LIMIT 1', [gameId]);
    const statusText = rows[0].status;

    if (statusText === 'running' || statusText === 'finished') {
      return statusText;
    }
    throw new Error('Invalid status for ' + gameId + ': ' + statusText);
  }

  async completedTime(gameId: GameId): Promise<number | undefined> {
    const row = await this.asyncGet('SELECT completed_time FROM completed_game WHERE game_id = $1', [gameId]);
    return row.completed_time;
  }

  setCompletedTime(gameId: GameId, timestampSeconds: number): Promise<RunResult> {
    return this.asyncRun('UPDATE completed_game SET completed_time = to_timestamp(?) WHERE game_id = ?', [timestampSeconds, gameId]);
  }

  setSaveCreatedTime(gameId: GameId, saveId: number, timestampSeconds: number): Promise<RunResult> {
    return this.asyncRun('UPDATE games SET created_time = ? WHERE game_id = ? AND save_id = ?', [timestampSeconds, gameId, saveId]);
  }
}

describeDatabaseSuite({
  name: 'SQLite',
  constructor: () => new TestSQLite(),
  omit: {
    markFinished: true,
  },
  stats: {
    type: 'SQLite',
    path: ':memory:',
    size_bytes: -1,
  },
  otherTests: (dbFactory) => {
    it('treats null legacy save timestamps as unavailable', async () => {
      const db = dbFactory();
      const player = TestPlayer.BLACK.newPlayer();
      const game = Game.newInstance('game-null-save-time', [player], player, 'spectatorid');

      await db.lastSaveGamePromise;
      db.database.prepare('UPDATE games SET created_time = NULL WHERE game_id = ?').run(game.id);

      expect(await db.getLastSaveTimeMs(game.id)).is.undefined;
    });

    it('restoreGameAt loads the latest remaining save when the target save id is missing', async () => {
      const db = dbFactory();
      const loader = GameLoader.newTestInstance({sleepMillis: 0, evictMillis: 100, idleMillis: 0, sweep: 'manual'}, new FakeClock());
      const player = TestPlayer.BLACK.newPlayer();
      const game = Game.newInstance('game-skipped-save-id', [player], player, 'spectatorid');

      await db.lastSaveGamePromise;
      game.generation = 2;
      await db.saveGame(game);
      game.generation = 3;
      await db.saveGame(game);
      game.generation = 4;
      await db.saveGame(game);
      db.database.prepare('DELETE FROM games WHERE game_id = ? AND save_id = ?').run(game.id, 2);
      await loader.add(game);

      const preview = await loader.getGameAtOrBefore(game.id, 2);
      const restored = await loader.restoreGameAt(game.id, 2);

      expect(preview.generation).eq(2);
      expect(restored.generation).eq(2);
      expect(await db.getSaveIds(game.id)).has.members([0, 1]);
    });
  },
});
