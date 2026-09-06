import {expect} from 'chai';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Database from 'better-sqlite3';
import {mock} from 'node:test';
import {SQLiteArchiveRetention} from '@/server/archive/SQLiteArchiveRetention';

const supported = process.platform === 'win32' || (process.platform === 'linux' && process.env.CI === 'true');

(supported ? describe : describe.skip)('SQLiteArchiveRetention', () => {
  let workspace: string;
  let filename: string;
  let output: string;
  let db: Database.Database;
  let retention: SQLiteArchiveRetention;
  const gameId = 'g000000000007';
  const states = [0, 2, 7, 9].map((lastSaveId) => ({id: gameId, lastSaveId,
    phase: lastSaveId === 9 ? 'end' : 'action', privateHand: ['private-' + lastSaveId]}));

  beforeEach(async () => {
    const lab = process.platform === 'win32' ? 'D:/tm-db/smartbot-lab/sqlite-retention-tests' : tmpdir();
    await fs.mkdir(lab, {recursive: true});
    workspace = await fs.mkdtemp(join(lab, 'tm-retention-'));
    filename = join(workspace, 'copy.sqlite');
    output = join(workspace, 'archives');
    await fs.mkdir(output);
    db = new Database(filename);
    db.exec(`CREATE TABLE games (game_id TEXT, save_id INTEGER, game TEXT, players INTEGER,
      status TEXT, created_time INTEGER, PRIMARY KEY(game_id, save_id));
      CREATE TABLE completed_game (game_id TEXT PRIMARY KEY, completed_time INTEGER);`);
    for (const state of states) {
      db.prepare('INSERT INTO games VALUES (?, ?, ?, 2, ?, 0)').run(gameId, state.lastSaveId, JSON.stringify(state), 'finished');
    }
    db.prepare('INSERT INTO completed_game VALUES (?, 0)').run(gameId);
    retention = new SQLiteArchiveRetention(db, filename, {root: output, workspace});
  });
  afterEach(() => {
    mock.restoreAll();
    db.close();
  });

  const liveIds = () => (db.prepare('SELECT save_id AS id FROM games WHERE game_id = ? ORDER BY save_id').all(gameId) as Array<{id: number}>).map((row) => row.id);
  async function archive() {
    const plan = await retention.preview(gameId);
    return retention.apply(gameId, plan.sourceRevision, true);
  }

  it('previews without writes then preserves every state while removing only verified intermediate rows', async () => {
    const before = await fs.readFile(filename);
    const plan = await retention.preview(gameId);
    expect(plan.status).eq('READY'); expect(plan.prunableRows).eq(2);
    expect(await fs.readFile(filename)).deep.eq(before);
    expect(await fs.readdir(output)).deep.eq([]);
    await retention.apply(gameId, plan.sourceRevision, true);
    const live = db.prepare('SELECT save_id FROM games ORDER BY save_id').all();
    expect(live).deep.eq([{save_id: 0}, {save_id: 9}]);
    for (const state of states) {
      expect(await retention.catalog.getGameVersion(gameId, state.lastSaveId)).deep.eq(state);
    }
    expect((await retention.preview(gameId)).status).eq('ALREADY_ARCHIVED');
    expect((await retention.apply(gameId, plan.sourceRevision, true)).removedRows).eq(0);
    expect(liveIds()).deep.eq([0, 9]);
  });

  it('rejects a changed selection, incomplete state or missing exclusive consent without output writes', async () => {
    const plan = await retention.preview(gameId);
    await fails(retention.apply(gameId, plan.sourceRevision, false), 'SOURCE_UNSUPPORTED');
    db.prepare('UPDATE games SET game = ? WHERE game_id = ? AND save_id = 2').run(JSON.stringify({...states[1], privateHand: ['changed']}), gameId);
    await fails(retention.apply(gameId, plan.sourceRevision, true), 'SOURCE_CHANGED');
    db.prepare('UPDATE games SET game = ? WHERE game_id = ? AND save_id = 9').run(JSON.stringify({...states[3], phase: 'action'}), gameId);
    await fails(retention.preview(gameId), 'SOURCE_NOT_COMPLETED');
    expect(liveIds()).deep.eq([0, 2, 7, 9]);
    expect(await fs.readdir(output)).deep.eq([]);
  });

  it('checks space on the database filesystem even when archive storage has capacity', async () => {
    const statfs = fs.statfs.bind(fs);
    mock.method(fs, 'statfs', async (...args: Parameters<typeof fs.statfs>) => {
      const value = await statfs(...args);
      return String(args[0]) === workspace ? {...value, bsize: 1n, bavail: 0n} : value;
    });
    await fails(retention.preview(gameId), 'INSUFFICIENT_SPACE');
    expect(liveIds()).deep.eq([0, 2, 7, 9]);
    expect(await fs.readdir(output)).deep.eq([]);
  });

  it('refuses a capacity path that does not identify the supplied SQLite connection', async () => {
    const other = join(workspace, 'other.sqlite');
    await fs.writeFile(other, 'unrelated synthetic input');
    const mismatched = new SQLiteArchiveRetention(db, other, {root: output, workspace});
    await fails(mismatched.preview(gameId), 'SOURCE_UNSUPPORTED');
    expect(liveIds()).deep.eq([0, 2, 7, 9]);
    expect(await fs.readdir(output)).deep.eq([]);
  });

  it('refuses source drift after archive publication without attaching or deleting rows', async () => {
    const plan = await retention.preview(gameId);
    const rename = fs.rename.bind(fs);
    const changed = {...states[1], privateHand: ['late change']};
    mock.method(fs, 'rename', async (...args: Parameters<typeof fs.rename>) => {
      await rename(...args);
      db.prepare('UPDATE games SET game = ? WHERE game_id = ? AND save_id = 2').run(JSON.stringify(changed), gameId);
    });
    await fails(retention.apply(gameId, plan.sourceRevision, true), 'SOURCE_CHANGED');
    expect(liveIds()).deep.eq([0, 2, 7, 9]);
    expect(JSON.parse((db.prepare('SELECT game FROM games WHERE save_id = 2').get() as {game: string}).game)).deep.eq(changed);
    expect(db.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'history_archives'").get()).eq(undefined);
    expect((await fs.readdir(output)).filter((name) => name.startsWith('archive-')).length).eq(1);
  });

  it('rolls back catalog creation and the first delete if a later delete fails', async () => {
    db.exec("CREATE TRIGGER fail_second_delete BEFORE DELETE ON games WHEN OLD.save_id = 7 BEGIN SELECT RAISE(ABORT, 'private trigger'); END;");
    const plan = await retention.preview(gameId);
    await fails(retention.apply(gameId, plan.sourceRevision, true), 'IO_FAILURE');
    expect(liveIds()).deep.eq([0, 2, 7, 9]);
    expect(db.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'history_archives'").get()).eq(undefined);
    db.exec('DROP TRIGGER fail_second_delete');
    expect((await retention.apply(gameId, plan.sourceRevision, true)).removedRows).eq(2);
  });

  it('rolls back hydration, detach and a failed mutation together, then allows retry', async () => {
    await archive();
    const binding = retention.catalog.getBinding(gameId);
    let observedTransaction = false;
    await fails(retention.withHydratedHistory(gameId, () => {
      observedTransaction = db.inTransaction;
      db.prepare('DELETE FROM games WHERE game_id = ? AND save_id = 9').run(gameId);
      throw new Error('private mutation failure');
    }), 'IO_FAILURE');
    expect(observedTransaction).eq(true);
    expect(liveIds()).deep.eq([0, 9]);
    expect(retention.catalog.getBinding(gameId)).deep.eq(binding);
    await retention.withHydratedHistory(gameId, () => {
      db.prepare('DELETE FROM games WHERE game_id = ? AND save_id > 2').run(gameId);
    });
    expect(liveIds()).deep.eq([0, 2]);
    expect(retention.catalog.getBinding(gameId)).eq(undefined);
    expect(await retention.catalog.getGameVersion(gameId, 2)).deep.eq(states[1]);
    await fails(retention.catalog.getGameVersion(gameId, 7), 'SAVE_NOT_RECORDED');
  });

  it('detects late archive corruption before inserting any prepared missing rows', async () => {
    db.prepare('DELETE FROM games WHERE game_id = ?').run(gameId);
    for (let saveId = 0; saveId <= 21; saveId++) {
      db.prepare('INSERT INTO games VALUES (?, ?, ?, 2, ?, 0)').run(gameId, saveId,
        JSON.stringify({id: gameId, lastSaveId: saveId, phase: saveId === 21 ? 'end' : 'action'}), 'finished');
    }
    const result = await archive();
    const binding = retention.catalog.getBinding(gameId);
    const group = join(output, result.archiveName!, 'group-0001.json.gz');
    const bytes = await fs.readFile(group);
    await fs.writeFile(group, bytes.subarray(0, bytes.length - 1));
    let mutated = false;
    await fails(retention.withHydratedHistory(gameId, () => {
      mutated = true;
    }), 'ARCHIVE_CORRUPT');
    expect(mutated).eq(false); expect(liveIds()).deep.eq([0, 21]);
    expect(retention.catalog.getBinding(gameId)).deep.eq(binding);
  });

  it('refuses a busy writer within a finite wait while preserving source history', async () => {
    const plan = await retention.preview(gameId);
    const blocker = new Database(filename);
    blocker.exec('BEGIN IMMEDIATE');
    const started = Date.now();
    try {
      await fails(retention.apply(gameId, plan.sourceRevision, true), 'ARCHIVE_CONFLICT');
    } finally {
      blocker.exec('ROLLBACK'); blocker.close();
    }
    expect(Date.now() - started).lessThan(11000);
    expect(liveIds()).deep.eq([0, 2, 7, 9]);
  }).timeout(12000);

  it('leaves a final-only history unchanged instead of creating an unnecessary binding', async () => {
    db.prepare('DELETE FROM games WHERE game_id = ? AND save_id < 9').run(gameId);
    const before = await fs.readFile(filename);
    const plan = await retention.preview(gameId);
    expect(plan.status).eq('NOTHING_TO_PRUNE');
    expect((await retention.apply(gameId, plan.sourceRevision, true)).status).eq('NOTHING_TO_PRUNE');
    expect(await fs.readFile(filename)).deep.eq(before);
    expect(await fs.readdir(output)).deep.eq([]);
  });
});

async function fails(operation: Promise<unknown>, code: string) {
  try {
    await operation; expect.fail('operation accepted');
  } catch (error) {
    expect((error as Error).message).eq(code);
  }
}
