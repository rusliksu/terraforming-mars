import {expect} from 'chai';
import {ApiLiveGames} from '../../src/server/routes/ApiLiveGames';
import {IGame} from '../../src/server/IGame';
import {IPlayer} from '../../src/server/IPlayer';
import {DEFAULT_GAME_OPTIONS} from '../../src/server/game/GameOptions';
import {Phase} from '../../src/common/Phase';
import {GameId, SpectatorId} from '../../src/common/Types';
import {MockResponse} from './HttpMocks';
import {TestPlayer} from '../TestPlayer';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {statusCode} from '../../src/common/http/statusCode';
import {FakeGameLoader} from './FakeGameLoader';

function testGame(
  id: GameId,
  players: Array<IPlayer>,
  phase: Phase,
  expectedPurgeTimeMs = Date.now() + 86400000,
  gameAge = 1,
  lastSaveId = 1,
): IGame {
  return {
    id,
    activePlayer: players[0],
    expectedPurgeTimeMs: () => expectedPurgeTimeMs,
    gameOptions: DEFAULT_GAME_OPTIONS,
    lastSoloGeneration: () => 14,
    phase,
    players,
    playersInGenerationOrder: players,
    spectatorId: ('s-' + id) as SpectatorId,
    gameAge,
    lastSaveId,
  } as unknown as IGame;
}

describe('ApiLiveGames', () => {
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;

  beforeEach(() => {
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
  });

  function setLastSaveTime(game: IGame, lastSaveTimeMs: number): void {
    (scaffolding.ctx.gameLoader as FakeGameLoader).setLastSaveTimeMs(game.id, lastSaveTimeMs);
  }

  it('returns running games without requiring server id', async () => {
    const activePlayer = TestPlayer.BLUE.newPlayer();
    const activeGame = testGame('game-active', [activePlayer, TestPlayer.RED.newPlayer()], Phase.ACTION);
    await scaffolding.ctx.gameLoader.add(activeGame);

    const finishedPlayer = TestPlayer.RED.newPlayer();
    const finishedGame = testGame('game-finished', [finishedPlayer, TestPlayer.GREEN.newPlayer()], Phase.END);
    await scaffolding.ctx.gameLoader.add(finishedGame);

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    const games = JSON.parse(res.content);
    expect(games.map((game: {id: string}) => game.id)).deep.eq(['game-active']);
    expect(games[0].phase).eq(Phase.ACTION);
    expect(games[0].players.map((player: {name: string}) => player.name)).deep.eq(['player-blue', 'player-red']);
    expect(games[0].players.some((player: {id?: string}) => player.id !== undefined)).is.false;
    expect(games[0].spectatorId).eq(activeGame.spectatorId);
  });

  it('does not list solo games', async () => {
    const soloGame = testGame('game-solo', [TestPlayer.BLUE.newPlayer()], Phase.ACTION);
    await scaffolding.ctx.gameLoader.add(soloGame);

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(JSON.parse(res.content)).deep.eq([]);
  });

  it('lists fresh games even when their original purge deadline has passed', async () => {
    const activeGame = testGame('game-expired-but-fresh', [TestPlayer.BLUE.newPlayer(), TestPlayer.RED.newPlayer()], Phase.ACTION, Date.now() - 1);
    await scaffolding.ctx.gameLoader.add(activeGame);
    setLastSaveTime(activeGame, Date.now());

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(JSON.parse(res.content).map((game: {id: string}) => game.id)).deep.eq(['game-expired-but-fresh']);
  });

  it('lists games with no purge deadline', async () => {
    const asyncGame = testGame('game-async', [TestPlayer.BLUE.newPlayer(), TestPlayer.RED.newPlayer()], Phase.ACTION, 0);
    await scaffolding.ctx.gameLoader.add(asyncGame);

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(JSON.parse(res.content).map((game: {id: string}) => game.id)).deep.eq(['game-async']);
  });

  it('does not list games with stale saves', async () => {
    const now = Date.now();
    const freshGame = testGame('game-fresh', [TestPlayer.BLUE.newPlayer(), TestPlayer.RED.newPlayer()], Phase.ACTION);
    await scaffolding.ctx.gameLoader.add(freshGame);
    setLastSaveTime(freshGame, now - (12 * 60 * 60 * 1000));

    const staleGame = testGame('game-stale', [TestPlayer.GREEN.newPlayer(), TestPlayer.YELLOW.newPlayer()], Phase.ACTION);
    await scaffolding.ctx.gameLoader.add(staleGame);
    setLastSaveTime(staleGame, now - (19 * 60 * 60 * 1000));

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(JSON.parse(res.content).map((game: {id: string}) => game.id)).deep.eq(['game-fresh']);
  });

  it('does not list games with malformed escape velocity options', async () => {
    const malformedEscapeVelocityGame = testGame(
      'game-bad-ev',
      [TestPlayer.BLUE.newPlayer(), TestPlayer.RED.newPlayer()],
      Phase.ACTION,
    );
    Object.assign(malformedEscapeVelocityGame, {gameOptions: {
      ...malformedEscapeVelocityGame.gameOptions,
      escapeVelocity: {
        thresholdMinutes: -9999,
        bonusSectionsPerAction: -9999,
        penaltyPeriodMinutes: -12,
        penaltyVPPerPeriod: 999999,
      },
    }});
    await scaffolding.ctx.gameLoader.add(malformedEscapeVelocityGame);

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(JSON.parse(res.content)).deep.eq([]);
  });

  it('does not list obvious synthetic test games', async () => {
    const letterNamesGame = testGame(
      'game-letter-test',
      [
        TestPlayer.BLUE.newPlayer({name: 'A'}),
        TestPlayer.RED.newPlayer({name: 'B'}),
        TestPlayer.GREEN.newPlayer({name: 'C'}),
      ],
      Phase.ACTION,
    );
    await scaffolding.ctx.gameLoader.add(letterNamesGame);

    const inputLogGame = testGame(
      'game-input-log-test',
      [
        TestPlayer.BLUE.newPlayer({name: 'InputLog1'}),
        TestPlayer.RED.newPlayer({name: 'InputLog2'}),
        TestPlayer.GREEN.newPlayer({name: 'InputLog3'}),
      ],
      Phase.ACTION,
    );
    await scaffolding.ctx.gameLoader.add(inputLogGame);

    const mixedRealGame = testGame(
      'game-mixed-real',
      [
        TestPlayer.BLUE.newPlayer({name: 'A'}),
        TestPlayer.RED.newPlayer({name: 'GydRo'}),
      ],
      Phase.ACTION,
    );
    await scaffolding.ctx.gameLoader.add(mixedRealGame);

    scaffolding.url = '/api/live-games?limit=10';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(JSON.parse(res.content).map((game: {id: string}) => game.id)).deep.eq(['game-mixed-real']);
  });

  it('does not list pre-start initial drafting games', async () => {
    const initialDraftGame = testGame(
      'game-initial-draft',
      [TestPlayer.BLUE.newPlayer(), TestPlayer.RED.newPlayer()],
      Phase.INITIALDRAFTING,
    );
    await scaffolding.ctx.gameLoader.add(initialDraftGame);
    setLastSaveTime(initialDraftGame, Date.now());

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(JSON.parse(res.content)).deep.eq([]);
  });

  it('sorts by latest save before phase priority', async () => {
    const now = Date.now();
    const actionGame = testGame('game-action', [TestPlayer.BLUE.newPlayer(), TestPlayer.RED.newPlayer()], Phase.ACTION);
    await scaffolding.ctx.gameLoader.add(actionGame);
    setLastSaveTime(actionGame, now - (12 * 60 * 60 * 1000));

    const researchGame = testGame('game-research', [TestPlayer.GREEN.newPlayer(), TestPlayer.YELLOW.newPlayer()], Phase.RESEARCH);
    await scaffolding.ctx.gameLoader.add(researchGame);
    setLastSaveTime(researchGame, now);

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(JSON.parse(res.content).map((game: {id: string}) => game.id)).deep.eq(['game-research', 'game-action']);
  });

  it('does not list games where every player kept the default color name', async () => {
    const defaultNameGame = testGame(
      'game-default-names',
      [TestPlayer.BLUE.newPlayer({name: 'Blue'}), TestPlayer.RED.newPlayer({name: 'Red'})],
      Phase.ACTION,
    );
    await scaffolding.ctx.gameLoader.add(defaultNameGame);

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    expect(JSON.parse(res.content)).deep.eq([]);
  });

  it('ranks active games before draft clutter before applying the default limit', async () => {
    for (let idx = 0; idx < 8; idx++) {
      const draftGame = testGame(
        ('game-draft-' + idx) as GameId,
        [TestPlayer.BLUE.newPlayer(), TestPlayer.RED.newPlayer()],
        Phase.DRAFTING,
        Date.now() + 86400000,
        100,
        100,
      );
      await scaffolding.ctx.gameLoader.add(draftGame);
    }
    const actionGame = testGame(
      'game-action',
      [TestPlayer.GREEN.newPlayer(), TestPlayer.RED.newPlayer()],
      Phase.ACTION,
      Date.now() + 86400000,
      10,
      10,
    );
    await scaffolding.ctx.gameLoader.add(actionGame);

    scaffolding.url = '/api/live-games';
    await scaffolding.get(ApiLiveGames.INSTANCE, res);

    expect(res.statusCode).eq(statusCode.ok);
    const games = JSON.parse(res.content);
    expect(games).has.length(2);
    expect(games[0].id).eq('game-action');
    expect(games.map((game: {id: string}) => game.id)).contains('game-action');
  });
});
