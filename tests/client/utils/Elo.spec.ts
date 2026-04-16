import {expect} from 'chai';
import {Color} from '@/common/Color';
import {buildEloResultsForPlayers, findMatchingEloGame, lookupEloEntry, normalizeEloName} from '@/client/utils/elo';

describe('elo utils', () => {
  it('normalizes known aliases', () => {
    expect(normalizeEloName('Лёха')).eq('алексей');
    expect(normalizeEloName('genuinegold')).eq('илья');
    expect(normalizeEloName('GydRo')).eq('gydro');
  });

  it('matches finished game by normalized names and exact VP totals', () => {
    const players = [
      {name: 'Лёха', color: 'blue' as Color, victoryPointsBreakdown: {total: 100}},
      {name: 'GydRo', color: 'red' as Color, victoryPointsBreakdown: {total: 120}},
    ];

    const games = [
      {
        results: [
          {displayName: 'Алексей', vp: 99},
          {displayName: 'GydRo', vp: 120},
        ],
      },
      {
        results: [
          {displayName: 'Алексей', vp: 100},
          {displayName: 'GydRo', vp: 120},
        ],
      },
    ];

    expect(findMatchingEloGame(games, players)).eq(games[1]);
  });

  it('builds ordered elo result rows for player table', () => {
    const playersInPlace = [
      {name: 'GydRo', color: 'red' as Color, victoryPointsBreakdown: {total: 120}},
      {name: 'Лёха', color: 'blue' as Color, victoryPointsBreakdown: {total: 100}},
    ];

    const matchedGame = {
      results: [
        {displayName: 'GydRo', oldElo: 1500, newElo: 1510, delta: 10, vp: 120},
        {displayName: 'Алексей', oldElo: 1500, newElo: 1490, delta: -10, vp: 100},
      ],
    };

    const eloPlayers = {
      'gydro': {displayName: 'GydRo', elo: 1510, avgPlaceScore: 0.75},
      'алексей': {displayName: 'Алексей', elo: 1490, avgPlaceScore: 0.25},
    };

    const rows = buildEloResultsForPlayers(playersInPlace, eloPlayers, matchedGame);

    expect(rows).deep.eq([
      {name: 'GydRo', color: 'red', oldElo: 1500, newElo: 1510, delta: 10, avgPlaceScore: 0.75},
      {name: 'Лёха', color: 'blue', oldElo: 1500, newElo: 1490, delta: -10, avgPlaceScore: 0.25},
    ]);
  });

  it('prefers user-based elo identity over shared display names', () => {
    const eloPlayers = {
      'паша': {displayName: 'Паша', elo: 1660, avgPlaceScore: 0.8},
      'user:red-pasha': {displayName: 'Паша', elo: 1510, avgPlaceScore: 0.45, user: 'red-pasha'},
    };

    expect(lookupEloEntry(eloPlayers, 'Паша', 'red-pasha')?.elo).eq(1510);
    expect(lookupEloEntry(eloPlayers, 'Паша', 'new-user')).eq(null);
    expect(lookupEloEntry(eloPlayers, 'Паша')?.elo).eq(1660);
  });

  it('matches finished game by user identity when available', () => {
    const players = [
      {name: 'Паша', user: 'orange-pasha', color: 'orange' as Color, victoryPointsBreakdown: {total: 100}},
      {name: 'Паша', user: 'red-pasha', color: 'red' as Color, victoryPointsBreakdown: {total: 82}},
    ];

    const games = [
      {
        results: [
          {displayName: 'Паша', user: 'orange-pasha', vp: 82},
          {displayName: 'Паша', user: 'red-pasha', vp: 100},
        ],
      },
      {
        results: [
          {displayName: 'Паша', user: 'orange-pasha', vp: 100},
          {displayName: 'Паша', user: 'red-pasha', vp: 82},
        ],
      },
    ];

    expect(findMatchingEloGame(games, players)).eq(games[1]);
  });
});
