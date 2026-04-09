import {expect} from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import {EloSyncService, rebuildEloData} from '../../src/server/elo/EloSyncService';

describe('EloSyncService', () => {
  let tempDir: string;
  let primaryPath: string;
  let mirrorPath: string;
  let service: EloSyncService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tm-elo-'));
    primaryPath = path.join(tempDir, 'data.json');
    mirrorPath = path.join(tempDir, 'elo-data.json');
    service = new EloSyncService(primaryPath, mirrorPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, {recursive: true, force: true});
  });

  it('records a completed game and writes both elo files', async () => {
    await service.recordCompletedGameSummary({
      key: 'g1',
      completedTime: 1712188800,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      players: [
        {name: 'Alice', vp: 100, corp: 'CrediCor'},
        {name: 'Bob', vp: 92, corp: 'Inventrix'},
        {name: 'Carol', vp: 85, corp: 'Helion'},
      ],
    });

    const primary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
    const mirror = JSON.parse(await fs.readFile(mirrorPath, 'utf8'));

    expect(primary.games).to.have.length(1);
    expect(mirror).to.deep.equal(primary);
    expect(primary.players.alice.displayName).eq('Alice');
    expect(primary.players.alice.games).eq(1);
    expect(primary.players.alice.avgPlaceScore).eq(1);
    expect(primary.players.bob.avgPlaceScore).eq(0.5);
    expect(primary.players.carol.avgPlaceScore).eq(0);
    expect(primary.games[0].results[0].delta).to.be.a('number');
  });

  it('replaces duplicate game keys instead of appending duplicates', async () => {
    await service.recordCompletedGameSummary({
      key: 'g1',
      completedTime: 1712188800,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      players: [
        {name: 'Alice', vp: 100, corp: 'CrediCor'},
        {name: 'Bob', vp: 92, corp: 'Inventrix'},
      ],
    });
    await service.recordCompletedGameSummary({
      key: 'g1',
      completedTime: 1712188801,
      server: 'test',
      map: 'THARSIS',
      generation: 11,
      players: [
        {name: 'Alice', vp: 90, corp: 'CrediCor'},
        {name: 'Bob', vp: 110, corp: 'Inventrix'},
      ],
    });

    const primary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
    expect(primary.games).to.have.length(1);
    expect(primary.games[0].generation).eq(11);
    expect(primary.players.bob.avgPlaceScore).eq(1);
    expect(primary.players.alice.avgPlaceScore).eq(0);
  });

  it('rebuilds ratings in completed-time order', () => {
    const rebuilt = rebuildEloData([
      {
        _key: 'g2',
        date: '2026-04-04T00:00:02.000Z',
        server: 'test',
        map: 'THARSIS',
        generation: 11,
        playerCount: 2,
        completedTime: 2,
        results: [
          {name: 'alice', displayName: 'Alice', place: 1, vp: 90, corp: 'CrediCor'},
          {name: 'bob', displayName: 'Bob', place: 2, vp: 80, corp: 'Inventrix'},
        ],
      },
      {
        _key: 'g1',
        date: '2026-04-04T00:00:01.000Z',
        server: 'test',
        map: 'THARSIS',
        generation: 10,
        playerCount: 2,
        completedTime: 1,
        results: [
          {name: 'alice', displayName: 'Alice', place: 2, vp: 80, corp: 'CrediCor'},
          {name: 'bob', displayName: 'Bob', place: 1, vp: 90, corp: 'Inventrix'},
        ],
      },
    ]);

    expect(rebuilt.games[0]._key).eq('g1');
    expect(rebuilt.games[1]._key).eq('g2');
    expect(rebuilt.players.alice.games).eq(2);
    expect(rebuilt.players.bob.games).eq(2);
  });
});
