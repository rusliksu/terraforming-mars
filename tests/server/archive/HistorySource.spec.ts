import {expect} from 'chai';
import fs from 'node:fs/promises';
import {join} from 'node:path';
import Database from 'better-sqlite3';
import nodeModule from 'node:module';
import {mock} from 'node:test';
import {HistorySource} from '@/server/archive/HistorySource';
import {LIMITS} from '@/server/archive/ArchiveFormat';

(process.platform === 'win32' ? describe : describe.skip)('HistorySource', () => {
  let root: string;
  const gameId = 'g000000000001';
  const first = {id: gameId, lastSaveId: 2, phase: 'action', extension: null};
  const last = {id: gameId, lastSaveId: 7, phase: 'end', extension: {unknown: true}};
  beforeEach(async () => {
    const lab = 'D:/tm-db/smartbot-lab/archive-source-tests';
    await fs.mkdir(lab, {recursive: true});
    root = await fs.mkdtemp(join(lab, 'case-'));
    await fs.mkdir(join(root, 'history'));
    await fs.writeFile(join(root, 'history', gameId + '-00002.json'), JSON.stringify(first));
    await fs.writeFile(join(root, 'history', gameId + '-00007.json'), JSON.stringify(last));
    await fs.writeFile(join(root, gameId + '.json'), JSON.stringify(last));
  });
  afterEach(() => {
    mock.restoreAll();
  });

  it('reads only the selected history in numeric order, retaining gaps and unknown data', async () => {
    await fs.writeFile(join(root, 'history', 'unrelated.json'), 'invalid private data');
    const source = new HistorySource({kind: 'files', path: root, gameId, offline: true});
    const states: Array<unknown> = [];
    const before = await fs.readFile(join(root, gameId + '.json'));
    const snapshot = await source.scan(async (saved) => {
      states.push(saved.state);
    });
    expect(snapshot.entries.map((entry) => entry.saveId)).deep.eq([2, 7]);
    expect(states).deep.eq([first, last]);
    expect((await source.scan()).fingerprint).eq(snapshot.fingerprint);
    expect(await fs.readFile(join(root, gameId + '.json'))).deep.eq(before);
    expect(source.metadata.engineRevision).eq('unknown');
  });

  it('detects reused save ids and refuses current/history disagreement or duplicate ids', async () => {
    const source = new HistorySource({kind: 'files', path: root, gameId, offline: true});
    const before = await source.scan();
    await fs.writeFile(join(root, 'history', gameId + '-00002.json'), JSON.stringify({...first, extension: 'corrected'}));
    expect((await source.scan()).fingerprint).not.eq(before.fingerprint);
    await fs.writeFile(join(root, gameId + '.json'), JSON.stringify({...last, phase: 'action'}));
    await expectFailure(source.scan(), 'SOURCE_NOT_COMPLETED');
    await fs.writeFile(join(root, gameId + '.json'), JSON.stringify(last));
    await fs.copyFile(join(root, 'history', gameId + '-00002.json'), join(root, 'history', gameId + '-2.json'));
    await expectFailure(source.scan(), 'SOURCE_UNSUPPORTED');
  });

  it('uses a real read-only SQLite transaction without changing the offline copy', async () => {
    const filename = join(root, 'copy.sqlite');
    const db = new Database(filename);
    db.exec('CREATE TABLE games (game_id TEXT, save_id INTEGER, game TEXT)');
    const insert = db.prepare('INSERT INTO games VALUES (?, ?, ?)');
    insert.run(gameId, 7, JSON.stringify(last));
    insert.run(gameId, 2, JSON.stringify(first));
    insert.run('other', 0, 'unrelated invalid JSON');
    db.close();
    const before = await fs.readFile(filename);
    const source = new HistorySource({kind: 'sqlite', path: filename, gameId, offline: true});
    const states: Array<unknown> = [];
    expect((await source.scan(async (saved) => {
      states.push(saved.state);
    })).entries.length).eq(2);
    expect(states).deep.eq([first, last]);
    expect(await fs.readFile(filename)).deep.eq(before);
    await expectFailure(new HistorySource({kind: 'sqlite', path: join(root, 'missing.sqlite'), gameId, offline: true}).scan(), 'SOURCE_UNSUPPORTED');
  });

  it('refuses linked input and an empty selected history', async () => {
    const link = root + '-link';
    await fs.symlink(root, link, 'junction');
    await expectFailure(new HistorySource({kind: 'files', path: link, gameId, offline: true}).scan(), 'SOURCE_UNSUPPORTED');
    await expectFailure(new HistorySource({kind: 'files', path: root, gameId: 'missing', offline: true}).scan(), 'SOURCE_HISTORY_EMPTY');
  });

  it('refuses SQLite row limits, WAL copies and an unavailable optional backend', async () => {
    const filename = join(root, 'bounded.sqlite');
    const db = new Database(filename);
    db.exec('CREATE TABLE games (game_id TEXT, save_id INTEGER, game TEXT)');
    const insert = db.prepare('INSERT INTO games VALUES (?, ?, ?)');
    db.transaction(() => {
      for (let i = 0; i <= LIMITS.records; i++) {
        insert.run(gameId, i, '{}');
      }
    })();
    db.close();
    const source = new HistorySource({kind: 'sqlite', path: filename, gameId, offline: true});
    await expectFailure(source.scan(), 'LIMIT_EXCEEDED');
    await fs.writeFile(filename + '-wal', 'unfinished backup');
    await expectFailure(source.scan(), 'SOURCE_UNSUPPORTED');
    await fs.unlink(filename + '-wal');
    mock.method(nodeModule, 'createRequire', () => () => {
      throw new Error('optional backend unavailable');
    });
    await expectFailure(source.scan(), 'SOURCE_UNSUPPORTED');
    expect((await fs.readdir(root)).some((name) => name.endsWith('-journal') || name.endsWith('-shm'))).eq(false);
  });
});

async function expectFailure(operation: Promise<unknown>, code: string) {
  try {
    await operation; expect.fail('operation accepted');
  } catch (error) {
    expect((error as Error).message).eq(code);
  }
}
