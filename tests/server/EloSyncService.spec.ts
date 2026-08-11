import {expect} from 'chai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import {buildEloGameFromSummary, EloSyncService, effectiveEloForExpectedScore, normalizeEloIdentity, rebuildEloData} from '../../src/server/elo/EloSyncService';
import {Game} from '../../src/server/Game';
import {TestPlayer} from '../TestPlayer';

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

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
    expect(primary.games[0].results[0].completionOutcome).eq(undefined);
  });

  it('tracks only confirmed human leaves in a rolling window without changing Elo', () => {
    const games = Array.from({length: 10}, (_value, index) => ({
      _key: `g-reliability-${index}`,
      date: `2026-04-04T00:00:${String(index).padStart(2, '0')}.000Z`,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      playerCount: 2,
      completedTime: index + 1,
      results: [
        {name: 'alice', displayName: 'Alice', place: 1, vp: 100, corp: 'CrediCor', completionOutcome: index < 3 ? 'left' as const : 'completed' as const},
        {name: 'bob', displayName: 'Bob', place: 2, vp: 90, corp: 'Helion', completionOutcome: 'completed' as const},
      ],
    }));
    const withReliability = rebuildEloData(games);
    const withoutReliability = rebuildEloData(games.map((game) => ({
      ...game,
      results: game.results.map(({completionOutcome: _completionOutcome, ...result}) => result),
    })));

    expect(withReliability.players.alice.completionReliability).deep.eq({games: 10, leaves: 3, rate: 0.3, eligible: true});
    expect(withReliability.players.bob.completionReliability).deep.eq({games: 10, leaves: 0, rate: 0, eligible: false});
    expect(withReliability.players.alice.elo).eq(withoutReliability.players.alice.elo);
    expect(withReliability.players.alice.elo_vp).eq(withoutReliability.players.alice.elo_vp);
  });

  it('ranks completed, surrendered and left outcomes before VP', () => {
    const game = buildEloGameFromSummary({
      key: 'g-outcome-order',
      completedTime: 1,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      completionOutcomeKnown: true,
      surrenderedPlayerIds: ['p-bob'],
      confirmedLeavePlayerIds: ['p-carol'],
      players: [
        {id: 'p-alice', name: 'Alice', vp: 50, megacredits: 0, corp: 'CrediCor'},
        {id: 'p-bob', name: 'Bob', vp: 200, megacredits: 0, corp: 'Helion'},
        {id: 'p-carol', name: 'Carol', vp: 300, megacredits: 0, corp: 'Inventrix'},
      ],
    });

    expect(game.results.map((result) => ({
      name: result.displayName,
      place: result.place,
      outcome: result.completionOutcome,
    }))).deep.eq([
      {name: 'Alice', place: 1, outcome: 'completed'},
      {name: 'Bob', place: 2, outcome: 'surrendered'},
      {name: 'Carol', place: 3, outcome: 'left'},
    ]);
  });

  it('uses outcome places for place Elo without changing VP Elo', () => {
    const outcomeGame = buildEloGameFromSummary({
      key: 'g-outcome-elo',
      completedTime: 1,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      completionOutcomeKnown: true,
      surrenderedPlayerIds: ['p-bob'],
      confirmedLeavePlayerIds: ['p-carol'],
      players: [
        {id: 'p-alice', name: 'Alice', vp: 50, corp: 'CrediCor'},
        {id: 'p-bob', name: 'Bob', vp: 200, corp: 'Helion'},
        {id: 'p-carol', name: 'Carol', vp: 300, corp: 'Inventrix'},
      ],
    });
    const vpOrderedGame = {
      ...outcomeGame,
      results: [
        {...outcomeGame.results.find((result) => result.displayName === 'Carol')!, place: 1, completionOutcome: undefined},
        {...outcomeGame.results.find((result) => result.displayName === 'Bob')!, place: 2, completionOutcome: undefined},
        {...outcomeGame.results.find((result) => result.displayName === 'Alice')!, place: 3, completionOutcome: undefined},
      ],
    };

    const outcomeRatings = rebuildEloData([outcomeGame]);
    const vpOrderedRatings = rebuildEloData([vpOrderedGame]);

    expect(outcomeRatings.players.alice.elo).not.eq(vpOrderedRatings.players.alice.elo);
    expect(outcomeRatings.players.alice.elo_vp).eq(vpOrderedRatings.players.alice.elo_vp);
    expect(outcomeRatings.players.bob.elo_vp).eq(vpOrderedRatings.players.bob.elo_vp);
    expect(outcomeRatings.players.carol.elo_vp).eq(vpOrderedRatings.players.carol.elo_vp);
  });

  it('uses VP then megacredits inside each non-completed outcome group', () => {
    const game = buildEloGameFromSummary({
      key: 'g-outcome-tiebreakers',
      completedTime: 1,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      completionOutcomeKnown: true,
      surrenderedPlayerIds: ['p-bob', 'p-dan'],
      confirmedLeavePlayerIds: ['p-carol', 'p-eve'],
      players: [
        {id: 'p-alice', name: 'Alice', vp: 50, megacredits: 0, corp: 'CrediCor'},
        {id: 'p-bob', name: 'Bob', vp: 90, megacredits: 10, corp: 'Helion'},
        {id: 'p-dan', name: 'Dan', vp: 90, megacredits: 20, corp: 'Inventrix'},
        {id: 'p-carol', name: 'Carol', vp: 100, megacredits: 5, corp: 'Ecoline'},
        {id: 'p-eve', name: 'Eve', vp: 100, megacredits: 15, corp: 'Tharsis Republic'},
      ],
    });

    expect(game.results.map((result) => result.displayName)).deep.eq(['Alice', 'Dan', 'Bob', 'Eve', 'Carol']);
    expect(game.results.map((result) => result.place)).deep.eq([1, 2, 3, 4, 5]);
  });

  it('shares place only for equal outcome, VP and megacredits', () => {
    const game = buildEloGameFromSummary({
      key: 'g-shared-outcome-place',
      completedTime: 1,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      completionOutcomeKnown: true,
      surrenderedPlayerIds: ['p-bob', 'p-carol'],
      players: [
        {id: 'p-alice', name: 'Alice', vp: 50, megacredits: 0, corp: 'CrediCor'},
        {id: 'p-bob', name: 'Bob', vp: 90, megacredits: 10, corp: 'Helion'},
        {id: 'p-carol', name: 'Carol', vp: 90, megacredits: 10, corp: 'Inventrix'},
      ],
    });

    expect(game.results.map((result) => result.place)).deep.eq([1, 2, 2]);
  });

  it('counts surrendered as known without counting a leave', () => {
    const rebuilt = rebuildEloData([{
      _key: 'g-completion-groups',
      date: '2026-04-04T00:00:01.000Z',
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      playerCount: 3,
      completedTime: 1,
      results: [
        {name: 'alice', displayName: 'Alice', place: 1, vp: 100, corp: 'CrediCor', completionOutcome: 'completed' as const},
        {name: 'bob', displayName: 'Bob', place: 2, vp: 90, corp: 'Helion', completionOutcome: 'surrendered' as const},
        {name: 'carol', displayName: 'Carol', place: 3, vp: 80, corp: 'Inventrix', completionOutcome: 'left' as const},
      ],
    }]);

    expect(rebuilt.players.bob.completionReliability).deep.eq({games: 1, leaves: 0, rate: 0, eligible: false});
    expect(rebuilt.players.carol.completionReliability).deep.eq({games: 1, leaves: 1, rate: 1, eligible: false});
  });

  it('keeps only the last 20 known outcomes for reliability', () => {
    const games = Array.from({length: 21}, (_value, index) => ({
      _key: `g-window-${index}`,
      date: `2026-04-04T00:00:${String(index).padStart(2, '0')}.000Z`,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      playerCount: 2,
      completedTime: index + 1,
      results: [
        {name: 'alice', displayName: 'Alice', place: 1, vp: 100, corp: 'CrediCor', completionOutcome: index === 0 || index === 20 ? 'left' as const : 'completed' as const},
        {name: 'bob', displayName: 'Bob', place: 2, vp: 90, corp: 'Helion', completionOutcome: 'completed' as const},
      ],
    }));

    expect(rebuildEloData(games).players.alice.completionReliability).deep.eq({games: 20, leaves: 1, rate: 0.05, eligible: false});
  });

  it('records a surrendered human without treating the game as automated', async () => {
    const alice = TestPlayer.BLUE.newPlayer({name: 'Alice'});
    const bob = TestPlayer.RED.newPlayer({name: 'Bob'});
    const game = Game.newInstance('g-surrendered-player', [alice, bob], alice, 'spectatorid');
    game.generation = 10;
    alice.setTerraformRating(80);
    bob.setTerraformRating(70);
    game.surrenderedPlayerIds.add(alice.id);

    await service.recordCompletedGame(game);

    const primary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
    expect(primary.games[0].results.map((result: {displayName: string}) => result.displayName)).deep.eq(['Bob', 'Alice']);
    expect(primary.games[0].results.map((result: {place: number}) => result.place)).deep.eq([1, 2]);
    expect(primary.games[0].results.find((result: {displayName: string}) => result.displayName === 'Alice').completionOutcome).eq('surrendered');
    expect(primary.games[0].results.find((result: {displayName: string}) => result.displayName === 'Bob').completionOutcome).eq('completed');
    expect(primary.players.alice.completionReliability).deep.eq({games: 1, leaves: 0, rate: 0, eligible: false});

    const automatedGame = Game.newInstance('g-automated', [alice, bob], alice, 'spectatorid');
    automatedGame.generation = 10;
    automatedGame.setBotPlayerIds([alice.id]);
    await service.recordCompletedGame(automatedGame);

    const afterAutomated = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
    expect(afterAutomated.games.map((entry: {_key: string}) => entry._key)).deep.eq(['g-surrendered-player']);
  });

  it('treats an overlapping surrendered and left ID as left and reports the invariant', () => {
    const originalWarn = console.warn;
    const warnings: Array<unknown> = [];
    console.warn = (...args: Array<unknown>) => warnings.push(args);
    try {
      const game = buildEloGameFromSummary({
        key: 'g-overlap',
        completedTime: 1,
        server: 'test',
        map: 'THARSIS',
        generation: 10,
        completionOutcomeKnown: true,
        surrenderedPlayerIds: ['p-alice'],
        confirmedLeavePlayerIds: ['p-alice'],
        players: [
          {id: 'p-alice', name: 'Alice', vp: 100, corp: 'CrediCor'},
          {id: 'p-bob', name: 'Bob', vp: 90, corp: 'Helion'},
        ],
      });

      expect(game.results.find((result) => result.displayName === 'Alice')?.completionOutcome).eq('left');
      expect(warnings).has.length(1);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('keeps surrendered legacy outcomes and drops unknown future values safely', () => {
    const rebuilt = rebuildEloData([{
      _key: 'g-legacy-outcomes',
      date: '2026-04-04T00:00:01.000Z',
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      playerCount: 2,
      completedTime: 1,
      results: [
        {name: 'alice', displayName: 'Alice', place: 1, vp: 100, corp: 'CrediCor', completionOutcome: 'surrendered' as const},
        {name: 'bob', displayName: 'Bob', place: 2, vp: 90, corp: 'Helion', completionOutcome: 'future-value' as any},
      ],
    }]);

    expect(rebuilt.games[0].results[0].completionOutcome).eq('surrendered');
    expect(rebuilt.games[0].results[1].completionOutcome).eq(undefined);
    expect(rebuilt.players.alice.completionReliability).deep.eq({games: 1, leaves: 0, rate: 0, eligible: false});
    expect(rebuilt.players.bob.completionReliability).eq(undefined);
  });

  it('does not erase a stricter stored completion outcome during metadata merge', async () => {
    const base = {
      key: 'g-merge-outcome',
      completedTime: 1,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      completionOutcomeKnown: true,
      players: [
        {id: 'p-alice', name: 'Alice', vp: 100, corp: 'CrediCor'},
        {id: 'p-bob', name: 'Bob', vp: 90, corp: 'Helion'},
      ],
    };
    await service.recordCompletedGameSummary({...base, confirmedLeavePlayerIds: ['p-alice']});
    await service.recordCompletedGameSummary({...base, completedTime: 2});

    const primary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
    expect(primary.games[0].results.find((result: {displayName: string}) => result.displayName === 'Alice').completionOutcome).eq('left');
    expect(primary.games[0].results.map((result: {displayName: string; place: number}) => ({
      name: result.displayName,
      place: result.place,
    }))).deep.eq([
      {name: 'Bob', place: 1},
      {name: 'Alice', place: 2},
    ]);
  });

  it('uses megacredits as the live-game tie-breaker when final VP are equal', async () => {
    const alice = TestPlayer.BLUE.newPlayer({name: 'Alice'});
    const bob = TestPlayer.RED.newPlayer({name: 'Bob'});
    const game = Game.newInstance('g-equal-vp-mc', [alice, bob], alice, 'spectatorid');
    game.generation = 10;
    alice.setTerraformRating(80);
    bob.setTerraformRating(80);
    alice.megaCredits = 12;
    bob.megaCredits = 30;

    await service.recordCompletedGame(game);

    const primary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
    expect(primary.games[0].results.map((result: {displayName: string; place: number; vp: number}) => ({
      displayName: result.displayName,
      place: result.place,
      vp: result.vp,
    }))).deep.eq([
      {displayName: 'Bob', place: 1, vp: 80},
      {displayName: 'Alice', place: 2, vp: 80},
    ]);
  });

  it('does not record games marked as no-ELO', async () => {
    const alice = TestPlayer.BLUE.newPlayer({name: 'Alice'});
    const bob = TestPlayer.RED.newPlayer({name: 'Bob'});
    const game = Game.newInstance('g-training', [alice, bob], alice, 'spectatorid', {noEloGame: true});
    game.generation = 10;
    alice.setTerraformRating(80);
    bob.setTerraformRating(70);

    await service.recordCompletedGame(game);

    expect(await pathExists(primaryPath)).eq(false);
    expect(await pathExists(mirrorPath)).eq(false);
  });

  it('does not record games with malformed escape velocity options', async () => {
    const alice = TestPlayer.BLUE.newPlayer({name: 'Alice'});
    const bob = TestPlayer.RED.newPlayer({name: 'Bob'});
    const game = Game.newInstance('g-bad-ev', [alice, bob], alice, 'spectatorid', {
      escapeVelocity: {
        thresholdMinutes: -9999,
        bonusSectionsPerAction: -9999,
        penaltyPeriodMinutes: -12,
        penaltyVPPerPeriod: 999999,
      },
    });
    game.generation = 10;
    alice.setTerraformRating(80);
    bob.setTerraformRating(70);

    await service.recordCompletedGame(game);

    expect(await pathExists(primaryPath)).eq(false);
    expect(await pathExists(mirrorPath)).eq(false);
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
          {name: 'alice', displayName: 'Alice', place: 1, vp: 95, corp: 'CrediCor'},
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
    expect(rebuilt.players.alice.totalGens).eq(21);
    expect(rebuilt.players.alice.avgGens).eq(10.5);
    expect(rebuilt.players.alice.totalMargin).eq(5);
    expect(rebuilt.players.alice.avgMargin).eq(2.5);
    expect(rebuilt.players.bob.totalMargin).eq(-5);
    expect(rebuilt.players.bob.avgMargin).eq(-2.5);
  });

  it('uses lower effective Elo while players are provisional', () => {
    expect(effectiveEloForExpectedScore({elo: 1500, elo_vp: 1510, games: 0}, 'elo')).eq(1300);
    expect(effectiveEloForExpectedScore({elo: 1500, elo_vp: 1510, games: 1}, 'elo')).eq(1375);
    expect(effectiveEloForExpectedScore({elo: 1500, elo_vp: 1510, games: 2}, 'elo')).eq(1450);
    expect(effectiveEloForExpectedScore({elo: 1500, elo_vp: 1510, games: 3}, 'elo')).eq(1500);
    expect(effectiveEloForExpectedScore({elo: 1290, elo_vp: 1510, games: 0}, 'elo')).eq(1290);
    expect(effectiveEloForExpectedScore({elo: 1500, elo_vp: 1510, games: 1}, 'elo_vp')).eq(1375);
  });

  it('does not overpay established players for beating a first-game player', () => {
    const game = (
      key: string,
      completedTime: number,
      loser: string,
    ) => ({
      _key: key,
      date: `2026-04-04T00:00:0${completedTime}.000Z`,
      server: 'test',
      map: 'THARSIS',
      generation: 10,
      playerCount: 2,
      completedTime,
      results: [
        {name: 'vet', displayName: 'Vet', place: 1, vp: 100, corp: 'CrediCor'},
        {name: loser.toLowerCase(), displayName: loser, place: 2, vp: 80, corp: 'Helion'},
      ],
    });
    const rebuilt = rebuildEloData([
      game('g1', 1, 'A'),
      game('g2', 2, 'B'),
      game('g3', 3, 'C'),
      game('g4', 4, 'Rookie'),
    ]);
    const finalGame = rebuilt.games[3];

    expect(finalGame.results[0].displayName).eq('Vet');
    expect(finalGame.results[0].delta).eq(9);
    expect(finalGame.results[1].displayName).eq('Rookie');
    expect(finalGame.results[1].delta).eq(-9);
    expect(rebuilt.players.rookie.elo).eq(1491);
  });

  it('backfills date and duration from timestamps during rebuild', () => {
    const rebuilt = rebuildEloData([
      {
        _key: 'g-duration',
        date: '',
        server: 'test',
        map: 'THARSIS',
        generation: 9,
        playerCount: 2,
        startedTime: 1712181600,
        completedTime: 1712188800,
        source: 'import',
        analyzedBy: ['codex'],
        analysisTargets: ['advisor', 'smartbot'],
        results: [
          {name: 'alice', displayName: 'Alice', place: 1, vp: 95, corp: 'CrediCor'},
          {name: 'bob', displayName: 'Bob', place: 2, vp: 88, corp: 'Inventrix'},
        ],
      },
    ]);

    expect(rebuilt.games[0].date).eq('2024-04-04T00:00:00.000Z');
    expect(rebuilt.games[0].durationMs).eq(7_200_000);
    expect(rebuilt.games[0].durationMinutes).eq(120);
    expect(rebuilt.games[0].source).eq('import');
    expect(rebuilt.games[0].analyzedBy).to.deep.equal(['codex']);
    expect(rebuilt.games[0].analysisTargets).to.deep.equal(['advisor', 'smartbot']);
  });

  it('canonicalizes explicit aliases in existing stored games during rebuild', () => {
    const rebuilt = rebuildEloData([
      {
        _key: 'g-stored-alias',
        date: '2026-04-04T00:00:03.000Z',
        server: 'test',
        map: 'THARSIS',
        generation: 8,
        playerCount: 2,
        completedTime: 3,
        results: [
          {name: 'руслан', displayName: 'Руслан', user: 'ruslan-user', place: 1, vp: 87, corp: 'CrediCor'},
          {name: 'user:pasha-user', displayName: 'Паша', user: 'pasha-user', place: 2, vp: 80, corp: 'Helion'},
        ],
      },
    ]);

    expect(rebuilt.players.gydro.displayName).eq('GydRo');
    expect(rebuilt.players.gydro.games).eq(1);
    expect(rebuilt.players['user:ruslan-user']).eq(undefined);
    expect(rebuilt.games[0].results[0].name).eq('gydro');
    expect(rebuilt.games[0].results[0].displayName).eq('GydRo');
  });

  it('normalizes shared ELO player aliases on the server', () => {
    expect(normalizeEloIdentity('Влад')).deep.eq({key: 'влад', displayName: 'Влад'});
    expect(normalizeEloIdentity('vlad')).deep.eq({key: 'vlad', displayName: 'vlad'});
    expect(normalizeEloIdentity('Vladlen Grishaev')).deep.eq({key: 'владлен', displayName: 'Владлен'});
    expect(normalizeEloIdentity('Вангер Думов')).deep.eq({key: 'вангер', displayName: 'Вангер'});
    expect(normalizeEloIdentity('Олеся Игнатова')).deep.eq({key: 'gambitgirl', displayName: 'GambitGirl'});
    expect(normalizeEloIdentity('Sergey')).deep.eq({key: 'serge', displayName: 'Serge'});
    expect(normalizeEloIdentity('Владимир')).deep.eq({key: 'владимир', displayName: 'Владимир'});
  });

  it('splits same display name players by user identity when provided', async () => {
    await service.recordCompletedGameSummary({
      key: 'g-shared-name',
      completedTime: 1712188802,
      server: 'test',
      map: 'HELLAS',
      generation: 9,
      players: [
        {name: 'Sam', user: 'orange-sam', vp: 96, corp: 'CrediCor'},
        {name: 'Sam', user: 'red-sam', vp: 82, corp: 'Helion'},
      ],
    });

    const primary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
    expect(primary.players['user:orange-sam'].displayName).eq('Sam');
    expect(primary.players['user:red-sam'].displayName).eq('Sam');
    expect(primary.players['user:orange-sam'].games).eq(1);
    expect(primary.players['user:red-sam'].games).eq(1);
    expect(primary.games[0].results[0].user).eq('orange-sam');
    expect(primary.games[0].results[1].user).eq('red-sam');
  });

  it('maps explicit player aliases to canonical elo identity before user identity', async () => {
    await service.recordCompletedGameSummary({
      key: 'g-alias',
      completedTime: 1712188803,
      server: 'test',
      map: 'THARSIS',
      generation: 8,
      players: [
        {name: 'Руслан', user: 'ruslan-user', vp: 87, corp: 'CrediCor'},
        {name: 'Паша', user: 'pasha-user', vp: 80, corp: 'Helion'},
      ],
    });

    const primary = JSON.parse(await fs.readFile(primaryPath, 'utf8'));
    expect(primary.players.gydro.displayName).eq('GydRo');
    expect(primary.players.gydro.games).eq(1);
    expect(primary.players['user:ruslan-user']).eq(undefined);
    expect(primary.games[0].results[0].name).eq('gydro');
    expect(primary.games[0].results[0].displayName).eq('GydRo');
  });

  it('merges configured local duplicate player names', () => {
    const rebuilt = rebuildEloData([
      {
        _key: 'g-pasha-pavel',
        date: '2026-04-25T00:00:01.000Z',
        server: 'test',
        map: 'THARSIS',
        generation: 8,
        playerCount: 2,
        completedTime: 1,
        results: [
          {name: 'паша', displayName: 'Паша', place: 1, vp: 90, corp: 'CrediCor'},
          {name: 'alice', displayName: 'Alice', place: 2, vp: 80, corp: 'Helion'},
        ],
      },
      {
        _key: 'g-pavel',
        date: '2026-04-25T00:00:02.000Z',
        server: 'test',
        map: 'THARSIS',
        generation: 9,
        playerCount: 2,
        completedTime: 2,
        results: [
          {name: 'павел', displayName: 'Павел', place: 1, vp: 95, corp: 'Inventrix'},
          {name: 'alice', displayName: 'Alice', place: 2, vp: 85, corp: 'Helion'},
        ],
      },
      {
        _key: 'g-sonya-antistress',
        date: '2026-04-25T00:00:03.000Z',
        server: 'test',
        map: 'THARSIS',
        generation: 7,
        playerCount: 3,
        completedTime: 3,
        results: [
          {name: 'соня', displayName: 'Соня', place: 1, vp: 88, corp: 'Tharsis Republic'},
          {name: 'антистресс', displayName: 'Антистресс', place: 2, vp: 84, corp: 'Ecoline'},
          {name: 'bob', displayName: 'Bob', place: 3, vp: 70, corp: 'Mining Guild'},
        ],
      },
      {
        _key: 'g-olesya-gambit',
        date: '2026-04-25T00:00:04.000Z',
        server: 'test',
        map: 'THARSIS',
        generation: 8,
        playerCount: 2,
        completedTime: 4,
        results: [
          {name: 'олеся', displayName: 'Олеся', place: 1, vp: 91, corp: 'Saturn Systems'},
          {name: 'pavel', displayName: 'Pavel', place: 2, vp: 87, corp: 'Inventrix'},
        ],
      },
    ]);

    expect(rebuilt.players['паша'].displayName).eq('Паша');
    expect(rebuilt.players['паша'].games).eq(3);
    expect(rebuilt.players['павел']).eq(undefined);
    expect(rebuilt.players.pavel).eq(undefined);
    expect(rebuilt.players['тома'].displayName).eq('Тома');
    expect(rebuilt.players['тома'].games).eq(1);
    expect(rebuilt.players['соня']).eq(undefined);
    expect(rebuilt.players['антистресс'].displayName).eq('Антистресс');
    expect(rebuilt.players['антистресс'].games).eq(1);
    expect(rebuilt.players['анатолий']).eq(undefined);
    expect(rebuilt.players.gambitgirl.displayName).eq('GambitGirl');
    expect(rebuilt.players.gambitgirl.games).eq(1);
    expect(rebuilt.players['олеся']).eq(undefined);
    expect(rebuilt.games[1].results[0].name).eq('паша');
    expect(rebuilt.games[2].results[0].name).eq('тома');
    expect(rebuilt.games[2].results[1].name).eq('антистресс');
    expect(rebuilt.games[3].results[0].name).eq('gambitgirl');
    expect(rebuilt.games[3].results[1].name).eq('паша');
  });
});
