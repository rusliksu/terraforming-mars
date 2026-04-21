import {expect} from 'chai';
import {Color} from '@/common/Color';
import {buildEloResultsForPlayers, findMatchingEloGame, normalizeEloName} from '@/client/utils/elo';

describe('elo utils', () => {
  it('normalizes names consistently', () => {
    expect(normalizeEloName('  Player One  ')).eq('player one');
    expect(normalizeEloName('PLAYER TWO')).eq('player two');
  });

  it('matches finished game by normalized names and exact VP totals', () => {
    const players = [
      {name: 'Player One', color: 'blue' as Color, victoryPointsBreakdown: {total: 100}},
      {name: 'Player Two', color: 'red' as Color, victoryPointsBreakdown: {total: 120}},
    ];

    const games = [
      {
        results: [
          {displayName: 'player one', vp: 99},
          {displayName: 'player two', vp: 120},
        ],
      },
      {
        results: [
          {displayName: 'player one', vp: 100},
          {displayName: 'player two', vp: 120},
        ],
      },
    ];

    expect(findMatchingEloGame(games, players)).eq(games[1]);
  });

  it('builds ordered elo result rows for player table', () => {
    const playersInPlace = [
      {name: 'Player Two', color: 'red' as Color, victoryPointsBreakdown: {total: 120}},
      {name: 'Player One', color: 'blue' as Color, victoryPointsBreakdown: {total: 100}},
    ];

    const matchedGame = {
      results: [
        {displayName: 'player two', oldElo: 1500, newElo: 1510, delta: 10, vp: 120},
        {displayName: 'player one', oldElo: 1500, newElo: 1490, delta: -10, vp: 100},
      ],
    };

    const eloPlayers = {
      'player two': {displayName: 'Player Two', elo: 1510, avgPlaceScore: 0.75},
      'player one': {displayName: 'Player One', elo: 1490, avgPlaceScore: 0.25},
    };

    const rows = buildEloResultsForPlayers(playersInPlace, eloPlayers, matchedGame);

    expect(rows).deep.eq([
      {name: 'Player Two', color: 'red', oldElo: 1500, newElo: 1510, delta: 10, avgPlaceScore: 0.75},
      {name: 'Player One', color: 'blue', oldElo: 1500, newElo: 1490, delta: -10, avgPlaceScore: 0.25},
    ]);
  });
});
