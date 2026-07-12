import {expect} from 'chai';
import {Color} from '@/common/Color';
import {buildEloResultsForPlayers, findMatchingEloGame, lookupEloEntry, normalizeEloName} from '@/client/utils/elo';

describe('elo utils', () => {
  it('normalizes known aliases', () => {
    expect(normalizeEloName('  Player One  ')).eq('player one');
    expect(normalizeEloName('PLAYER TWO')).eq('player two');
    expect(normalizeEloName('Руслан')).eq('gydro');
    expect(normalizeEloName('ruslan')).eq('gydro');
    expect(normalizeEloName('Лёха')).eq('леха');
    expect(normalizeEloName('Лёха Инженер')).eq('леха');
    expect(normalizeEloName('Асмо')).eq('леха');
    expect(normalizeEloName('Алексей Часовщик')).eq('qiksa');
    expect(normalizeEloName('Qiksa')).eq('qiksa');
    expect(normalizeEloName('Женя')).eq('vvbminsk');
    expect(normalizeEloName('Евгений')).eq('vvbminsk');
    expect(normalizeEloName('Midilobusim')).eq('nuke');
    expect(normalizeEloName('Midilobisum')).eq('nuke');
    expect(normalizeEloName('Nuke')).eq('nuke');
    expect(normalizeEloName('Никита')).eq('никита');
    expect(normalizeEloName('Никита_Кусков')).eq('никита');
    expect(normalizeEloName('Никита Кусков')).eq('никита');
    expect(normalizeEloName('genuinegold')).eq('genuinegold');
    expect(normalizeEloName('Genuine Gold')).eq('genuinegold');
    expect(normalizeEloName('Равиль')).eq('рав');
    expect(normalizeEloName('Павел')).eq('паша');
    expect(normalizeEloName('Соня')).eq('тома');
    expect(normalizeEloName('Анатолий')).eq('антистресс');
    expect(normalizeEloName('Антистресс')).eq('антистресс');
    expect(normalizeEloName('Олеся')).eq('gambitgirl');
    expect(normalizeEloName('GambitGirl')).eq('gambitgirl');
    expect(normalizeEloName('GydRo')).eq('gydro');
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
      {name: 'Minsk', color: 'red' as Color, victoryPointsBreakdown: {total: 120}},
      {name: 'Player One', color: 'blue' as Color, victoryPointsBreakdown: {total: 100}},
    ];

    const matchedGame = {
      results: [
        {displayName: 'vvbMinsk', oldElo: 1500, newElo: 1510, delta: 10, vp: 120},
        {displayName: 'player one', oldElo: 1500, newElo: 1490, delta: -10, vp: 100},
      ],
    };

    const eloPlayers = {
      'vvbminsk': {displayName: 'vvbMinsk', elo: 1510, avgPlaceScore: 0.75},
      'player one': {displayName: 'Player One', elo: 1490, avgPlaceScore: 0.25},
    };

    const rows = buildEloResultsForPlayers(playersInPlace, eloPlayers, matchedGame);

    expect(rows).deep.eq([
      {name: 'vvbMinsk', color: 'red', oldElo: 1500, newElo: 1510, delta: 10, avgPlaceScore: 0.75},
      {name: 'Player One', color: 'blue', oldElo: 1500, newElo: 1490, delta: -10, avgPlaceScore: 0.25},
    ]);
  });
  it('prefers user-based elo identity over shared display names', () => {
    const eloPlayers = {
      'sam': {displayName: 'Sam', elo: 1660, avgPlaceScore: 0.8},
      'user:red-sam': {displayName: 'Sam', elo: 1510, avgPlaceScore: 0.45, user: 'red-sam'},
    };

    expect(lookupEloEntry(eloPlayers, 'Sam', 'red-sam')?.elo).eq(1510);
    expect(lookupEloEntry(eloPlayers, 'Sam', 'new-user')).eq(null);
    expect(lookupEloEntry(eloPlayers, 'Sam')?.elo).eq(1660);
  });

  it('falls back from unknown user identity to explicit player aliases', () => {
    const eloPlayers = {
      'gydro': {displayName: 'GydRo', elo: 1613, avgPlaceScore: 0.75},
    };

    expect(lookupEloEntry(eloPlayers, 'Руслан', 'ruslan-user')?.elo).eq(1613);
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
