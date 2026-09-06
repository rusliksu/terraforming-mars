import {expect} from 'chai';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {mock} from 'node:test';
import {SQLite} from '@/server/database/SQLite';
import {GameLoader} from '@/server/database/GameLoader';
import {LoadGame} from '@/server/routes/LoadGame';
import {Phase} from '@/common/Phase';
import {GameId} from '@/common/Types';
import {testGame} from '@tests/TestGame';
import {FakeClock} from '@tests/common/FakeClock';
import {restoreTestDatabase, restoreTestGameLoader, setTestDatabase, setTestGameLoader} from '@tests/testing/setup';
import {MockRequest, MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

class ArchiveDatabase extends SQLite {
  lastRollback: Promise<void> = Promise.resolve();
  get retention() {
    return this.archive;
  }
  override deleteGameNbrSaves(gameId: GameId, count: number): Promise<void> {
    this.lastRollback = super.deleteGameNbrSaves(gameId, count);
    return this.lastRollback;
  }
  close() {
    this.db.close();
  }
}

const supported = process.platform === 'win32' || (process.platform === 'linux' && process.env.CI === 'true');

(supported ? describe : describe.skip)('LoadGameArchive', () => {
  let db: ArchiveDatabase;
  let loader: GameLoader;
  let gameId: GameId;
  let archive: string;
  let req: MockRequest;
  let res: MockResponse;
  let scaffolding: RouteTestScaffolding;

  beforeEach(async () => {
    const lab = process.platform === 'win32' ? 'D:/tm-db/smartbot-lab/archive-route-tests' : tmpdir();
    await fs.mkdir(lab, {recursive: true});
    const workspace = await fs.mkdtemp(join(lab, 'tm-route-'));
    const root = join(workspace, 'archives');
    await fs.mkdir(root);
    db = new ArchiveDatabase(join(workspace, 'copy.sqlite'), true, 4096, {root, workspace});
    await db.initialize();
    setTestDatabase(db);
    loader = GameLoader.newTestInstance({sleepMillis: 0, evictMillis: 100, idleMillis: 1000, sweep: 'manual'}, new FakeClock());
    setTestGameLoader(loader);
    const [game] = testGame(2, {}, '-archive-route');
    await game.saveGamePromise;
    game.generation = 2;
    await loader.saveGame(game);
    game.generation = 3;
    await loader.saveGame(game);
    game.phase = Phase.END; game.generation = 4;
    await loader.saveGame(game);
    await db.markFinished(game.id);
    await loader.add(game);
    gameId = game.id;
    const plan = await db.retention.preview(gameId);
    const result = await db.retention.apply(gameId, plan.sourceRevision, true);
    archive = join(root, result.archiveName!);
    req = new MockRequest(); res = new MockResponse();
    scaffolding = new RouteTestScaffolding(req);
    scaffolding.ctx.gameLoader = loader;
  });
  afterEach(async () => {
    mock.restoreAll();
    await db.lastRollback.catch(() => {});
    restoreTestDatabase(); restoreTestGameLoader();
    db.close();
  });

  function put() {
    const response = scaffolding.put(LoadGame.INSTANCE, res);
    req.emitter.emit('data', JSON.stringify({gameId, rollbackCount: 2}));
    req.emitter.emit('end');
    return response;
  }

  it('waits for real archive hydration before sending the restored game response', async () => {
    const open = fs.open.bind(fs);
    let release: () => void = () => {};
    let entered: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const reading = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let held = false;
    mock.method(fs, 'open', async (...args: Parameters<typeof fs.open>) => {
      const handle = await open(...args);
      if (!held && String(args[0]).endsWith('manifest.json')) {
        held = true; entered();
        await gate;
      }
      return handle;
    });
    const response = put();
    try {
      await Promise.race([reading, response.then(() => {
        throw new Error('response sent before hydration');
      })]);
      expect(res.headersSent).eq(false);
    } finally {
      release();
      await response;
      await db.lastRollback;
    }
    expect(res.statusCode).eq(200); expect(JSON.parse(res.content).phase).eq(Phase.RESEARCH);
    expect((await db.getGame(gameId)).generation).eq(2);
    expect(await db.getSaveIds(gameId)).deep.eq([0, 1]);
    await (await loader.getGame(gameId))!.saveGamePromise;
  });

  it('returns an error and preserves the live history when archive hydration fails', async () => {
    await fs.rename(archive, archive + '-unavailable');
    await put();
    expect(res.statusCode).eq(500);
    expect(res.content).not.include(gameId);
    expect(db.retention.catalog.getBinding(gameId)).not.eq(undefined);
    expect((await db.getGame(gameId)).generation).eq(4);
  });
});
