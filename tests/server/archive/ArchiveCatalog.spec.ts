import {expect} from 'chai';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Database from 'better-sqlite3';
import {ArchiveCatalog} from '@/server/archive/ArchiveCatalog';
import {HistorySource} from '@/server/archive/HistorySource';
import {exportHistory} from '@/server/archive/ArchiveWriter';
import {readSave} from '@/server/archive/ArchiveReader';

const supported = process.platform === 'win32' || (process.platform === 'linux' && process.env.CI === 'true');

(supported ? describe : describe.skip)('ArchiveCatalog', () => {
  let workspace: string;
  let output: string;
  let filename: string;
  let db: Database.Database;
  let catalog: ArchiveCatalog;
  let archiveName: string;
  const gameId = 'g000000000005';
  const states = [0, 2, 7, 9].map((lastSaveId) => ({id: gameId, lastSaveId,
    phase: lastSaveId === 9 ? 'end' : 'action', privateHand: ['private-' + lastSaveId]}));

  beforeEach(async () => {
    const lab = process.platform === 'win32' ? 'D:/tm-db/smartbot-lab/archive-catalog-tests' : tmpdir();
    await fs.mkdir(lab, {recursive: true});
    workspace = await fs.mkdtemp(join(lab, 'tm-catalog-'));
    output = join(workspace, 'archives');
    await fs.mkdir(output);
    filename = join(workspace, 'copy.sqlite');
    db = new Database(filename);
    db.exec('CREATE TABLE games (game_id TEXT, save_id INTEGER, game TEXT, PRIMARY KEY(game_id, save_id))');
    const insert = db.prepare('INSERT INTO games VALUES (?, ?, ?)');
    for (const state of states) {
      insert.run(gameId, state.lastSaveId, JSON.stringify(state));
    }
    db.close();
    const source = new HistorySource({kind: 'sqlite', path: filename, gameId, offline: true, workspace});
    archiveName = (await exportHistory(source, output)).revision;
    db = new Database(filename);
    catalog = new ArchiveCatalog(db, output, workspace);
    catalog.initialize();
    const binding = await catalog.prepare(gameId, archiveName);
    db.transaction(() => {
      catalog.attach(binding);
      db.prepare('DELETE FROM games WHERE game_id = ? AND save_id IN (2, 7)').run(gameId);
    })();
  });
  afterEach(() => db.close());

  it('combines the current archive with live saves and reads every original value without writes', async () => {
    db.close();
    db = new Database(filename);
    catalog = new ArchiveCatalog(db, output, workspace);
    const before = await fs.readFile(filename);
    expect(await catalog.getSaveIds(gameId)).deep.eq([0, 2, 7, 9]);
    for (const state of states) {
      expect(await catalog.getGameVersion(gameId, state.lastSaveId)).deep.eq(state);
    }
    expect(await fs.readFile(filename)).deep.eq(before);
  });

  it('prefers a live override and never reattaches an old tail after the binding is detached', async () => {
    const replacement = {...states[2], privateHand: ['new branch']};
    db.prepare('INSERT INTO games VALUES (?, ?, ?)').run(gameId, 7, JSON.stringify(replacement));
    expect(await catalog.getGameVersion(gameId, 7)).deep.eq(replacement);
    const binding = catalog.getBinding(gameId)!;
    db.transaction(() => {
      catalog.detach(binding);
      db.prepare('DELETE FROM games WHERE game_id = ? AND save_id = 9').run(gameId);
    })();
    expect(await catalog.getSaveIds(gameId)).deep.eq([0, 7]);
    await fails(catalog.getGameVersion(gameId, 2), 'SAVE_NOT_RECORDED');
    await fails(catalog.getGameVersion(gameId, 9), 'SAVE_NOT_RECORDED');
    expect(await readSave(join(output, archiveName), 9)).deep.eq(states[3]);
  });

  it('rejects foreign histories, arbitrary paths and an unverified binding', async () => {
    await fails(catalog.prepare('other-game', archiveName), 'ARCHIVE_CORRUPT');
    await fails(catalog.prepare(gameId, '../copy.sqlite'), 'ARCHIVE_CORRUPT');
    const binding = catalog.getBinding(gameId)!;
    expect(() => db.transaction(() => catalog.attach(binding))()).to.throw('ARCHIVE_CONFLICT');
    expect(() => catalog.detach(binding)).to.throw('ARCHIVE_CONFLICT');
    expect(catalog.getBinding(gameId)).deep.eq(binding);
  });

  it('rejects unknown or inconsistent catalog metadata before returning archive history', async () => {
    db.prepare('UPDATE history_archives SET version = 2 WHERE game_id = ?').run(gameId);
    await fails(catalog.getSaveIds(gameId), 'UNSUPPORTED_ARCHIVE_VERSION');
    db.prepare('UPDATE history_archives SET version = 1, source_revision = ? WHERE game_id = ?').run('0'.repeat(64), gameId);
    await fails(catalog.getGameVersion(gameId, 2), 'ARCHIVE_CORRUPT');
    db.prepare('UPDATE history_archives SET archive_name = ? WHERE game_id = ?').run('../copy.sqlite', gameId);
    await fails(catalog.getSaveIds(gameId), 'ARCHIVE_CORRUPT');
    expect(await catalog.getGameVersion(gameId, 9)).deep.eq(states[3]);
  });

  it('refuses a corrupt or missing bound archive while preserving current live rows', async () => {
    const archive = join(output, archiveName);
    const group = join(archive, 'group-0000.json.gz');
    const bytes = await fs.readFile(group);
    await fs.writeFile(group, bytes.subarray(0, bytes.length - 1));
    await fails(catalog.getGameVersion(gameId, 2), 'ARCHIVE_CORRUPT');
    expect(await catalog.getGameVersion(gameId, 9)).deep.eq(states[3]);
    await fs.rename(archive, archive + '-unavailable');
    await fails(catalog.getSaveIds(gameId), 'ARCHIVE_CORRUPT');
    expect(await catalog.getGameVersion(gameId, 0)).deep.eq(states[0]);
  });

  it('does not invent save zero in gapped or final-only histories', async () => {
    for (const ids of [[3, 5], [5]]) {
      const selected = gameId + '-' + ids.length;
      const values = ids.map((lastSaveId) => ({id: selected, lastSaveId, phase: lastSaveId === 5 ? 'end' : 'action'}));
      for (const value of values) {
        db.prepare('INSERT INTO games VALUES (?, ?, ?)').run(selected, value.lastSaveId, JSON.stringify(value));
      }
      const source = new HistorySource({kind: 'sqlite', path: filename, gameId: selected, offline: true, workspace});
      const receipt = await exportHistory(source, output);
      const binding = await catalog.prepare(selected, receipt.revision);
      db.transaction(() => {
        catalog.attach(binding);
        db.prepare('DELETE FROM games WHERE game_id = ? AND save_id < 5').run(selected);
      })();
      expect(await catalog.getSaveIds(selected)).deep.eq(ids);
      await fails(catalog.getGameVersion(selected, 0), 'SAVE_NOT_RECORDED');
      for (const value of values) {
        expect(await catalog.getGameVersion(selected, value.lastSaveId)).deep.eq(value);
      }
    }
  });

  it('refuses a detached revision during an asynchronous lookup instead of returning stale history', async () => {
    const binding = catalog.getBinding(gameId)!;
    const version = catalog.getGameVersion(gameId, 2);
    const ids = catalog.getSaveIds(gameId);
    db.transaction(() => catalog.detach(binding))();
    await Promise.all([fails(version, 'SOURCE_CHANGED'), fails(ids, 'SOURCE_CHANGED')]);
  });

  it('uses a live override committed while archive bytes are being read', async () => {
    const pending = catalog.getGameVersion(gameId, 2);
    const replacement = {...states[1], privateHand: ['concurrent live value']};
    db.prepare('INSERT INTO games VALUES (?, ?, ?)').run(gameId, 2, JSON.stringify(replacement));
    expect(await pending).deep.eq(replacement);
  });
});

async function fails(operation: Promise<unknown>, code: string) {
  try {
    await operation; expect.fail('operation accepted');
  } catch (error) {
    expect((error as Error).message).eq(code);
  }
}
