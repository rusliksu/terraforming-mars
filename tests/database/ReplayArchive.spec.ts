import {expect} from 'chai';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SQLite} from '@/server/database/SQLite';
import {ApiReplay} from '@/server/routes/ApiReplay';
import {Phase} from '@/common/Phase';
import {GameId, SpectatorId} from '@/common/Types';
import {CrediCor} from '@/server/cards/corporation/CrediCor';
import {Helion} from '@/server/cards/corporation/Helion';
import {Birds} from '@/server/cards/base/Birds';
import {testGame} from '@tests/TestGame';
import {restoreTestDatabase, setTestDatabase} from '@tests/testing/setup';
import {MockResponse} from '@tests/routes/HttpMocks';
import {RouteTestScaffolding} from '@tests/routes/RouteTestScaffolding';

class ReplayDatabase extends SQLite {
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

(supported ? describe : describe.skip)('ReplayArchive', () => {
  let db: ReplayDatabase;
  let root: string;
  let filename: string;
  let gameId: GameId;
  let spectatorId: SpectatorId;

  beforeEach(async () => {
    const lab = process.platform === 'win32' ? 'D:/tm-db/smartbot-lab/replay-archive-tests' : tmpdir();
    await fs.mkdir(lab, {recursive: true});
    const workspace = await fs.mkdtemp(join(lab, 'tm-replay-'));
    root = join(workspace, 'archives');
    await fs.mkdir(root);
    filename = join(workspace, 'synthetic.sqlite');
    db = new ReplayDatabase(filename, true, 4096, {root, workspace});
    await db.initialize();
    setTestDatabase(db);
    const [game, blue, red] = testGame(2, {}, '-replay-archive');
    await game.saveGamePromise;
    blue.playedCards.push(new CrediCor());
    red.playedCards.push(new Helion());
    blue.cardsInHand = [new Birds()];
    for (const id of [2, 7, 9]) {
      game.lastSaveId = id;
      game.phase = id === 9 ? Phase.END : Phase.ACTION;
      blue.megaCredits = 30 + id;
      game.generation = id;
      await db.saveGame(game);
    }
    await db.markFinished(game.id);
    gameId = game.id;
    spectatorId = game.spectatorId;
  });
  afterEach(() => {
    restoreTestDatabase();
    db.close();
  });

  async function get(saveId?: number) {
    const scaffolding = new RouteTestScaffolding();
    scaffolding.url = `/api/replay?id=${spectatorId}` + (saveId === undefined ? '' : `&saveId=${saveId}`);
    const response = new MockResponse();
    await scaffolding.get(ApiReplay.INSTANCE, response);
    return response;
  }

  async function archive() {
    const plan = await db.retention.preview(gameId);
    const result = await db.retention.apply(gameId, plan.sourceRevision, true);
    expect(result.removedRows).eq(2);
    return join(root, result.archiveName!);
  }

  it('returns identical public frames from SQLite and archive without modifying either source', async () => {
    const ids = [0, 2, 7, 9];
    const before = await fs.readFile(filename);
    const frames = [];
    for (const id of ids) {
      const response = await get(id);
      expect(response.statusCode).eq(200);
      const frame = JSON.parse(response.content);
      expect(frame.saveId).eq(id);
      if (id !== 0) {
        expect(frame.view.players[0].megacredits).eq(30 + id);
      }
      expect(response.content).not.include('Birds');
      frames.push(response.content);
    }
    expect(await fs.readFile(filename)).deep.eq(before);
    const directory = await archive();
    const archivedDb = await fs.readFile(filename);
    const files = await fs.readdir(directory, {recursive: true});
    const contents = new Map<string, Buffer>();
    for (const path of files) {
      if ((await fs.stat(join(directory, path))).isFile()) {
        contents.set(path, await fs.readFile(join(directory, path)));
      }
    }
    expect(JSON.parse((await get()).content).saveIds).deep.eq(ids);
    for (const [index, id] of ids.entries()) {
      const response = await get(id);
      expect(response.statusCode).eq(200);
      expect(response.content).eq(frames[index]);
    }
    expect((await get(3)).statusCode).eq(404);
    expect(await fs.readFile(filename)).deep.eq(archivedDb);
    expect(await fs.readdir(directory, {recursive: true})).deep.eq(files);
    for (const [path, content] of contents) {
      expect(await fs.readFile(join(directory, path))).deep.eq(content);
    }
    expect(db.handle.prepare('SELECT save_id FROM games WHERE game_id = ? ORDER BY save_id').all(gameId))
      .deep.eq([{save_id: 0}, {save_id: 9}]);
  });

  it('prefers a live historical row and returns a sanitized failure for corrupt archived data', async () => {
    const live = await db.getGameVersion(gameId, 2);
    const directory = await archive();
    live.players[0].megaCredits = 99;
    db.handle.prepare('INSERT INTO games (game_id, players, save_id, game) VALUES (?, 2, 2, ?)')
      .run(gameId, JSON.stringify(live));
    const response = await get(2);
    expect(response.statusCode).eq(200);
    expect(JSON.parse(response.content).view.players[0].megacredits).eq(99);
    await fs.writeFile(join(directory, 'manifest.json'), 'corrupt-private-sentinel');
    const before = await fs.readFile(filename);
    const corrupt = await get(7);
    expect(corrupt.statusCode).eq(500);
    expect(corrupt.content).not.include(directory);
    expect(corrupt.content).not.include('private');
    expect(await fs.readFile(filename)).deep.eq(before);
  });
});
