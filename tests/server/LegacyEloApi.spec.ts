import {expect} from 'chai';

const {rebuildElo} = require('../../elo/elo-api.js') as {
  rebuildElo: (data: {players: Record<string, unknown>, games: Array<unknown>}) => void,
  effectiveEloForExpectedScore: (elo: number, completedGames: number) => number,
};

type LegacyEloResult = {
  oldElo: number;
  newElo: number;
  delta: number;
  [key: string]: unknown;
};

type LegacyEloData = {
  players: Record<string, {
    elo: number;
    elo_vp: number;
    wins: number;
    top3: number;
    avgPlace: number;
    totalGens: number;
    avgGens: number;
    totalMargin: number;
    avgMargin: number;
  }>;
  games: Array<{
    results: Array<LegacyEloResult>;
    [key: string]: unknown;
  }>;
};

describe('legacy elo-api', () => {
  it('uses lower effective Elo while players are provisional', () => {
    const {effectiveEloForExpectedScore} = require('../../elo/elo-api.js') as {
      effectiveEloForExpectedScore: (elo: number, completedGames: number) => number,
    };

    expect(effectiveEloForExpectedScore(1500, 0)).eq(1300);
    expect(effectiveEloForExpectedScore(1500, 1)).eq(1375);
    expect(effectiveEloForExpectedScore(1500, 2)).eq(1450);
    expect(effectiveEloForExpectedScore(1500, 3)).eq(1500);
    expect(effectiveEloForExpectedScore(1290, 0)).eq(1290);
  });

  it('rebuilds player generation/margin stats and per-game Elo deltas', () => {
    const data: LegacyEloData = {
      players: {},
      games: [
        {
          _key: 'g1',
          gameId: 'g1',
          completedTime: 1,
          generation: 9,
          results: [
            {name: 'GydRo', displayName: 'GydRo', place: 1, vp: 100, corp: 'Teractor', oldElo: 0, newElo: 0, delta: 0},
            {name: 'Рав', displayName: 'Рав', place: 2, vp: 92, corp: 'Tharsis Republic', oldElo: 0, newElo: 0, delta: 0},
          ],
        },
        {
          _key: 'g2',
          gameId: 'g2',
          completedTime: 2,
          generation: 10,
          results: [
            {name: 'GydRo', displayName: 'GydRo', place: 1, vp: 125, corp: 'Teractor|Lakefront Resorts', oldElo: 0, newElo: 0, delta: 0},
            {name: 'Рав', displayName: 'Рав', place: 2, vp: 124, corp: 'Tharsis Republic|Sagitta Frontier Services', oldElo: 0, newElo: 0, delta: 0},
            {name: 'Тома', displayName: 'Тома', place: 3, vp: 97, corp: 'Morning Star Inc.|Tycho Magnetics', oldElo: 0, newElo: 0, delta: 0},
          ],
        },
      ],
    };

    rebuildElo(data);

    expect(data.players.gydro.totalGens).eq(19);
    expect(data.players.gydro.avgGens).eq(9.5);
    expect(data.players.gydro.totalMargin).eq(9);
    expect(data.players.gydro.avgMargin).eq(4.5);

    const finalGame = data.games[1];
    expect(finalGame.results[0].delta).gt(0);
    expect(finalGame.results[1].delta).not.eq(0);
    expect(finalGame.results[2].delta).lt(0);
    expect(finalGame.results.every((entry) => entry.oldElo !== 0 || entry.newElo !== 0)).is.true;
  });

  it('treats final surrender midranks as losses without achievement credit', () => {
    const data: LegacyEloData = {
      players: {},
      games: [{
        generation: 7,
        results: [
          {name: 'winner', displayName: 'Winner', place: 1, vp: 50, completionOutcome: 'completed', oldElo: 0, newElo: 0, delta: 0},
          {name: 'a', displayName: 'A', place: 3, placeFrom: 2, placeTo: 4, vp: 50, completionOutcome: 'surrendered', oldElo: 0, newElo: 0, delta: 0},
          {name: 'b', displayName: 'B', place: 3, placeFrom: 2, placeTo: 4, vp: 50, completionOutcome: 'surrendered', oldElo: 0, newElo: 0, delta: 0},
          {name: 'c', displayName: 'C', place: 3, placeFrom: 2, placeTo: 4, vp: 50, completionOutcome: 'surrendered', oldElo: 0, newElo: 0, delta: 0},
        ],
      }],
    };

    rebuildElo(data);

    expect(data.players.winner.elo).gt(1500);
    for (const name of ['a', 'b', 'c']) {
      expect(data.players[name].elo).lt(1500);
      expect(data.players[name].elo_vp).eq(1500);
      expect(data.players[name].wins).eq(0);
      expect(data.players[name].top3).eq(0);
      expect(data.players[name].avgPlace).eq(0.3333);
    }
  });
});
