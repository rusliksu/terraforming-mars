import {expect} from 'chai';
import {projectWrybitUiStats} from '../../src/common/models/WrybitUiStats';
import {ApiWrybitStats} from '../../src/server/routes/ApiWrybitStats';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

describe('Wrybit public stats projection', () => {
  it('keeps only public result fields and drops private admin/raw fields', () => {
    const raw = {
      games: [{
        _key: 'private-key',
        gameId: 'game-1',
        endId: 'private-end-id',
        server: 'private-server',
        date: '2026-06-04T05:42:25Z',
        map: 'tharsis',
        generation: 10,
        playerCount: 2,
        startedTime: 1,
        completedTime: 2,
        durationMinutes: 12,
        results: [
          {name: 'internal-name', displayName: 'Alice', place: 1, vp: 90, corp: 'Helion', oldElo: 1500, newElo: 1520, delta: 20, private: 'no'},
          {name: 'bob', displayName: 'Bob', place: 2, vp: 80, corp: 'Ecoline'},
        ],
      }],
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

  it('serves the public projection without private fields', async () => {
    const scaffolding = new RouteTestScaffolding();
    const res = new MockResponse();
    scaffolding.url = '/api/wrybit/stats';
    await scaffolding.get(ApiWrybitStats.INSTANCE, res);
    const body = JSON.parse(res.content);
    expect(body.projectionVersion).eq(1);
    expect(body.source).eq('elo');
    expect(body.games.length).greaterThan(0);
    expect(JSON.stringify(body)).not.contains('_key');
    expect(JSON.stringify(body)).not.contains('startedTime');
  });

  it('returns an empty projection for malformed or empty input', () => {
    expect(projectWrybitUiStats(undefined).games).deep.eq([]);
    expect(projectWrybitUiStats({games: [null, {gameId: 'bad'}]}).games).deep.eq([]);
    expect(projectWrybitUiStats({games: []}).games).deep.eq([]);
  });
});
