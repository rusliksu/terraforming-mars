import {expect} from 'chai';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SQLite} from '@/server/database/SQLite';
import {GameLoader} from '@/server/database/GameLoader';
import {Cloner} from '@/server/database/Cloner';
import {Phase} from '@/common/Phase';
import {testGame} from '@tests/TestGame';
import {TestPlayer} from '@tests/TestPlayer';
import {FakeClock} from '@tests/common/FakeClock';
import {restoreTestDatabase, restoreTestGameLoader, setTestDatabase, setTestGameLoader} from '@tests/testing/setup';
import {readSave} from '@/server/archive/ArchiveReader';

class ArchiveDatabase extends SQLite {
  get retention() {
    return this.archive;
  }
  get handle() {
    return this.db;
  }
  close() {
    this.db.close();
  }
}

const supported = process.platform === 'win32' || (process.platform === 'linux' && process.env.CI === 'true');

(supported ? describe : describe.skip)('SQLiteArchiveHistory', () => {
  let workspace: string;
  let db: ArchiveDatabase;
  const gameId = 'g000000000006';

  beforeEach(async () => {
    const lab = process.platform === 'win32' ? 'D:/tm-db/smartbot-lab/sqlite-archive-tests' : tmpdir();
    await fs.mkdir(lab, {recursive: true});
    workspace = await fs.mkdtemp(join(lab, 'tm-retention-'));
    const output = join(workspace, 'archives');
    await fs.mkdir(output);
    db = new ArchiveDatabase(join(workspace, 'copy.sqlite'), true, 4096, {root: output, workspace});
    await db.initialize();
    for (const saveId of [0, 2, 7, 9]) {
      db.handle.prepare('INSERT INTO games (game_id, players, save_id, game, status) VALUES (?, 2, ?, ?, ?)')
        .run(gameId, saveId, JSON.stringify({id: gameId, lastSaveId: saveId, phase: saveId === 9 ? 'end' : 'action'}), 'finished');
    }
    db.handle.prepare('INSERT INTO completed_game (game_id, completed_time) VALUES (?, 0)').run(gameId);
  });
  afterEach(() => {
    restoreTestDatabase(); restoreTestGameLoader();
    db.close();
  });

  it('keeps completed history when automatic archive maintenance is disabled', async () => {
    await db.compressCompletedGames('0');
    await new Promise((resolve) => setImmediate(resolve));
    expect(await db.getSaveIds(gameId)).deep.eq([0, 2, 7, 9]);
  });

  it('clones and restores archived history through GameLoader without allowing a replaced resident game to save', async () => {
    setTestDatabase(db);
    const loader = GameLoader.newTestInstance({sleepMillis: 0, evictMillis: 100, idleMillis: 1000, sweep: 'manual'}, new FakeClock());
    setTestGameLoader(loader);
    const [game] = testGame(2, {}, '-archive-branch');
    await game.saveGamePromise;
    game.generation = 2; game.log('Kept action');
    await loader.saveGame(game);
    game.generation = 3; game.log('Canceled action');
    await loader.saveGame(game);
    game.generation = 4; game.phase = Phase.END;
    await loader.saveGame(game);
    await db.markFinished(game.id);
    await loader.add(game);
    const plan = await db.retention.preview(game.id);
    const archived = await db.retention.apply(game.id, plan.sourceRevision, true);
    expect(db.handle.prepare('SELECT save_id FROM games WHERE game_id = ? ORDER BY save_id').all(game.id))
      .deep.eq([{save_id: 0}, {save_id: 3}]);

    const initial = await db.getGameVersion(game.id, 0);
    const cloned = Cloner.clone('game-id-archive-clone', [TestPlayer.BLUE.newPlayer({idSuffix: '-clone'}),
      TestPlayer.RED.newPlayer({idSuffix: '-clone'})], 0, initial);
    await cloned.saveGamePromise;
    expect(cloned.id).eq('game-id-archive-clone'); expect(cloned.generation).eq(1);
    expect((await db.getGameVersion(game.id, 0)).id).eq(game.id);
    game.gameLog.length = 0;
    expect((await loader.getGame(game.id))!.gameLog.map((entry) => entry.message)).include('Canceled action');
    expect((await loader.getGameAt(game.id, 1)).generation).eq(2);

    const restored = await loader.restoreGameAt(game.id, 1);
    expect(restored.generation).eq(2);
    expect(restored.gameLog.find((entry) => entry.message === 'Canceled action')?.canceled).eq(true);
    expect(await db.getSaveIds(game.id)).deep.eq([0, 1]);
    expect(db.retention.catalog.getBinding(game.id)).eq(undefined);
    try {
      await loader.saveGame(game); expect.fail('replaced game saved');
    } catch (error) {
      expect((error as Error).message).eq('Game state changed; reload before saving.');
    }
    restored.generation = 8;
    await loader.saveGame(restored);
    restored.phase = Phase.END;
    await loader.saveGame(restored);
    await db.markFinished(restored.id);
    const nextPlan = await db.retention.preview(restored.id);
    const nextArchive = await db.retention.apply(restored.id, nextPlan.sourceRevision, true);
    expect(nextArchive.archiveName).not.eq(archived.archiveName);
    const oldEnd = await readSave(join(workspace, 'archives', archived.archiveName!), 3);
    expect(oldEnd).include({generation: 4, phase: 'end'});
    expect((await db.getGameVersion(restored.id, 3)).generation).eq(8);
  });
});
