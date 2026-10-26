import {expect} from 'chai';
import {mock} from 'node:test';
import {Phase} from '@/common/Phase';
import {ApiReplay} from '@/server/routes/ApiReplay';
import {CrediCor} from '@/server/cards/corporation/CrediCor';
import {Helion} from '@/server/cards/corporation/Helion';
import {testGame} from '@tests/TestGame';
import {InMemoryDatabase} from '@tests/testing/InMemoryDatabase';
import {restoreTestDatabase, setTestDatabase} from '@tests/testing/setup';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

describe('ApiReplay', () => {
  let db: InMemoryDatabase;
  const spectatorId = 'spectator-id-replay';
  const gameId = 'game-id-replay';

  beforeEach(async () => {
    db = new InMemoryDatabase();
    setTestDatabase(db);
    const [game, blue, red] = testGame(2, {}, '-replay');
    await game.saveGamePromise;
    blue.playedCards.push(new CrediCor());
    red.playedCards.push(new Helion());
    game.lastSaveId = 3;
    game.phase = Phase.ACTION;
    blue.megaCredits = 37;
    await db.saveGame(game);
    game.lastSaveId = 9;
    game.phase = Phase.END;
    blue.megaCredits = 41;
    await db.saveGame(game);
  });
  afterEach(() => {
    mock.restoreAll();
    restoreTestDatabase();
  });

  async function get(query = `id=${spectatorId}`) {
    const scaffolding = new RouteTestScaffolding();
    scaffolding.url = `/api/replay?${query}`;
    mock.method(scaffolding.ctx.gameLoader, 'getGame', () => {
      throw new Error('live loader called');
    });
    const res = new MockResponse();
    await scaffolding.get(ApiReplay.INSTANCE, res);
    return res;
  }

  it('lists actual saves and reads exactly one public historical frame without writes', async () => {
    const before = JSON.stringify([...db.games]);
    const writes = mock.method(db, 'saveGame', () => {
      throw new Error('write called');
    });
    const versions = mock.method(db, 'getGameVersion');
    const index = await get();
    expect(index.statusCode).eq(200);
    expect(JSON.parse(index.content).saveIds).deep.eq([0, 3, 9]);
    const res = await get(`id=${spectatorId}&saveId=3`);
    expect(res.statusCode).eq(200);
    expect(res.getHeader('Cache-Control')).eq('no-store');
    const frame = JSON.parse(res.content);
    expect(frame.saveId).eq(3);
    expect(frame.view.game.phase).eq(Phase.ACTION);
    expect(frame.view.players[0].megacredits).eq(37);
    expect(res.content).not.include('p-blue');
    expect(versions.mock.calls.map((call) => call.arguments)).deep.eq([[gameId, 3]]);
    expect(writes.mock.callCount()).eq(0);
    expect(JSON.stringify([...db.games])).eq(before);
  });

  it('rejects invalid IDs and save numbers before reading history', async () => {
    const reads = mock.method(db, 'getGameVersion');
    for (const query of ['id=game-id-replay', 'id=p-blue', '', `id=${spectatorId}&saveId=`,
      `id=${spectatorId}&saveId=-1`, `id=${spectatorId}&saveId=1.2`,
      `id=${spectatorId}&saveId=9007199254740992`]) {
      const res = await get(query);
      expect(res.statusCode, query).eq(400);
      expect(res.getHeader('Cache-Control')).eq('no-store');
    }
    const missing = await get(`id=${spectatorId}&saveId=4`);
    expect(missing.statusCode).eq(404);
    expect(reads.mock.callCount()).eq(0);
  });

  it('does not scan stored game JSON for an unknown spectator', async () => {
    const lookup = mock.method(db, 'getGameId', () => {
      throw new Error('history scan');
    });
    const reads = mock.method(db, 'getGame');
    expect((await get('id=sunknown')).statusCode).eq(404);
    expect(lookup.mock.callCount()).eq(0);
    expect(reads.mock.callCount()).eq(0);
  });

  it('checks the current spectator capability and completion before and after reading', async () => {
    const latest = await db.getGame(gameId);
    const ledger = await db.getParticipants();
    mock.method(db, 'getParticipants', async () => ledger);
    latest.spectatorId = 'sreplaced';
    expect((await get()).statusCode).eq(404);
    latest.spectatorId = spectatorId;
    latest.phase = Phase.ACTION;
    expect((await get()).statusCode).eq(404);
    latest.phase = Phase.END;
    const read = db.getGameVersion.bind(db);
    const hook = mock.method(db, 'getGameVersion', async (...args: Parameters<typeof db.getGameVersion>) => {
      const value = await read(...args);
      latest.phase = Phase.ACTION;
      return value;
    });
    expect((await get(`id=${spectatorId}&saveId=3`)).statusCode).eq(404);
    latest.phase = Phase.END;
    hook.mock.mockImplementation(async (...args: Parameters<typeof db.getGameVersion>) => {
      const value = await read(...args);
      latest.spectatorId = 'sreplaced';
      return value;
    });
    expect((await get(`id=${spectatorId}&saveId=3`)).statusCode).eq(404);
  });

  it('fails closed on a foreign frame, corrupt history and excessive save count', async () => {
    const saved = structuredClone(await db.getGameVersion(gameId, 3));
    saved.id = 'gforeign';
    const read = mock.method(db, 'getGameVersion', async () => saved);
    expect((await get(`id=${spectatorId}&saveId=3`)).statusCode).eq(500);
    read.mock.mockImplementation(async () => {
      throw new Error('D:/private/archive secret-sentinel');
    });
    const res = await get(`id=${spectatorId}&saveId=3`);
    expect(res.statusCode).eq(500);
    expect(res.content).not.include('private');
    expect(res.content).not.include('sentinel');
    mock.method(db, 'getSaveIds', async () => Array.from({length: 4097}, (_, i) => i));
    expect((await get()).statusCode).eq(500);
  });

  it('rejects excess concurrent reads without queuing database work and releases admission', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = db.getParticipants.bind(db);
    const reads = mock.method(db, 'getParticipants', async () => {
      await gate;
      return original();
    });
    const pending = Array.from({length: 4}, () => get());
    try {
      const res = await get();
      expect(res.statusCode).eq(429);
      expect(reads.mock.callCount()).eq(4);
    } finally {
      release();
      await Promise.all(pending);
    }
    expect((await get()).statusCode).eq(200);
  });
});
