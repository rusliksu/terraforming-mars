import {promises as fs} from 'fs';
import * as path from 'path';
import {expect} from 'chai';
import {projectWrybitUiStats} from '../../src/common/models/WrybitUiStats';
import {ApiWrybitStats} from '../../src/server/routes/ApiWrybitStats';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

function storedGame(overrides: Record<string, unknown> = {}) {
  return {
    _key: 'game-1',
    gameId: 'game-1',
    endId: 'end-1',
    server: 'server',
    date: '2026-06-04T05:42:25Z',
    map: 'tharsis',
    generation: 10,
    playerCount: 2,
    startedTime: 1,
    completedTime: 2,
    durationMinutes: 12,
    results: [
      {name: 'alice', displayName: 'Alice', place: 1, vp: 90, corp: 'Helion', oldElo: 1500, newElo: 1520, delta: 20},
      {name: 'bob', displayName: 'Bob', place: 2, vp: 80, corp: 'Ecoline'},
    ],
    ...overrides,
  };
}

describe('Wrybit public stats projection', () => {
  it('keeps only public result fields and drops private admin/raw fields', () => {
    const raw = {
      games: [storedGame({_key: 'private-key', endId: 'private-end-id', server: 'private-server',
        results: [
          {name: 'internal-name', displayName: 'Alice', place: 1, vp: 90, corp: 'Helion', oldElo: 1500, newElo: 1520, delta: 20, private: 'no'},
          {name: 'bob', displayName: 'Bob', place: 2, vp: 80, corp: 'Ecoline'},
        ]})],
      privateTopLevel: 'secret',
    };
    const snapshot = projectWrybitUiStats(raw);
    expect(snapshot.games).length(1);
    expect(snapshot.games[0].results[0]).deep.eq({
      displayName: 'Alice', place: 1, victoryPoints: 90, corporation: 'Helion',
      eloBefore: 1500, eloAfter: 1520, eloDelta: 20,
    });
    const serialized = JSON.stringify(snapshot);
    for (const privateField of ['private-key', 'private-end-id', 'private-server', 'internal-name', 'privateTopLevel', 'private']) {
      expect(serialized).not.contains(privateField);
    }
  });

  it('serves the public projection from the live ELO file without private fields', async () => {
    const directory = process.env.ELO_DATA_DIR as string;
    const file = path.join(directory, 'elo-data.json');
    await fs.mkdir(directory, {recursive: true});
    await fs.writeFile(file, JSON.stringify({
      players: {
        'alice': {displayName: 'Alice', elo: 1520, games: 2, wins: 1, top3: 2, avgVP: 90},
        'bot vega': {displayName: 'Bot Vega', elo: 1534, games: 1, wins: 1, top3: 1, avgVP: 86},
      },
      games: [storedGame()],
    }));
    try {
      const scaffolding = new RouteTestScaffolding();
      const res = new MockResponse();
      scaffolding.url = '/api/wrybit/stats';
      await scaffolding.get(ApiWrybitStats.INSTANCE, res);
      const body = JSON.parse(res.content);
      expect(body.projectionVersion).eq(1);
      expect(body.source).eq('elo');
      expect(body.games.length).eq(1);
      expect(body.ratings).deep.eq([{displayName: 'Alice', elo: 1520, games: 2, wins: 1, top3: 2, averageVictoryPoints: 90}]);
      expect(JSON.stringify(body)).not.contains('_key');
      expect(JSON.stringify(body)).not.contains('startedTime');
      expect(JSON.stringify(body)).not.contains('Bot Vega');
    } finally {
      await fs.rm(file, {force: true});
    }
  });

  it('keeps bot games and test line-ups out of the statistics', () => {
    const raw = {
      players: {'bot orion': {displayName: 'Bot Orion', elo: 1510, games: 1, wins: 0.5}},
      games: [
        storedGame(),
        storedGame({_key: 'bot-game', results: [
          {name: 'bot vega', displayName: 'Bot Vega', place: 1, vp: 86, corp: 'Tharsis Republic'},
          {name: 'gydro', displayName: 'GydRo', place: 2, vp: 66, corp: 'Recyclon'},
        ]}),
        storedGame({_key: 'benchmark', results: [
          {name: 'c', displayName: 'C', place: 1, vp: 79, corp: 'Polyphemos'},
          {name: 'b', displayName: 'B', place: 2, vp: 62, corp: 'Inventrix'},
          {name: 'a', displayName: 'A', place: 3, vp: 61, corp: 'Pristar'},
        ]}),
      ],
    };
    const snapshot = projectWrybitUiStats(raw);
    expect(snapshot.games.map((game) => game.id)).deep.eq(['game-1']);
    expect(snapshot.ratings).deep.eq([]);
  });

  it('keeps older stored games that only carry the internal key', () => {
    const snapshot = projectWrybitUiStats({games: [storedGame({gameId: undefined, _key: 'g-legacy'})]});
    expect(snapshot.games.map((game) => game.id)).deep.eq(['g-legacy']);
  });

  it('returns an empty projection for malformed or empty input', () => {
    expect(projectWrybitUiStats(undefined).games).deep.eq([]);
    expect(projectWrybitUiStats({games: [null, {gameId: 'bad'}]}).games).deep.eq([]);
    expect(projectWrybitUiStats({games: []}).games).deep.eq([]);
  });
});
