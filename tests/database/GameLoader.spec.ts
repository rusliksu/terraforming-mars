import {expect} from 'chai';
import {Game} from '../../src/server/Game';
import {GameLoader} from '../../src/server/database/GameLoader';
import {Player} from '../../src/server/Player';
import {SerializedGame} from '../../src/server/SerializedGame';
import {TestPlayer} from '../TestPlayer';
import {GameIdLedger} from '../../src/server/database/IDatabase';
import {GameId, PlayerId, SpectatorId} from '../../src/common/Types';
import {restoreTestDatabase, restoreTestGameLoader, setTestDatabase, setTestGameLoader} from '../testing/setup';
import {sleep} from '../TestingUtils';
import {InMemoryDatabase} from '../testing/InMemoryDatabase';
import {FakeClock} from '../common/FakeClock';
import {BotTakeoverManager} from '../../src/server/bot/BotTakeoverManager';
import {Phase} from '../../src/common/Phase';

function newBotManager(options: {startError?: Error}) {
  const active = new Set<PlayerId>();
  const starts: Array<Parameters<BotTakeoverManager['start']>[0]> = [];
  const manager: Pick<BotTakeoverManager, 'isActive' | 'start' | 'stop'> = {
    isActive: (playerId) => active.has(playerId),
    start: (startOptions) => {
      if (options.startError !== undefined) {
        throw options.startError;
      }
      active.add(startOptions.playerId);
      starts.push(startOptions);
      return {
        gameId: startOptions.gameId,
        playerId: startOptions.playerId,
        pid: 123,
        startedAtMs: 1,
        logFile: 'bot.log',
      };
    },
    stop: (playerId) => {
      active.delete(playerId);
      return undefined;
    },
  };
  return {active, manager, starts};
}

class TestDatabase extends InMemoryDatabase {
  public failure: 'getGameIds' | 'getParticipants' | undefined = undefined;
  public getGameSleep = 0;
  public extraParticipants: Array<GameIdLedger> = [];

  override async getGame(gameId: GameId): Promise<SerializedGame> {
    const game = await super.getGame(gameId);
    await sleep(this.getGameSleep);
    return game;
  }

  override getGameIds(): Promise<GameId[]> {
    if (this.failure === 'getGameIds') {
      return Promise.reject(new Error('error'));
    }
    return super.getGameIds();
  }
  override getParticipants(): Promise<Array<GameIdLedger>> {
    if (this.failure === 'getParticipants') {
      return Promise.reject(new Error('error'));
    }
    return super.getParticipants().then((participants) => participants.concat(this.extraParticipants));
  }
}

describe('GameLoader', () => {
  let instance: GameLoader;
  let database: TestDatabase;
  let game: Game;
  let clock: FakeClock;
  let botOptions: {startError?: Error};
  let botManager: ReturnType<typeof newBotManager>;

  beforeEach(() => {
    clock = new FakeClock();
    botOptions = {};
    botManager = newBotManager(botOptions);
    instance = GameLoader.newTestInstance(
      {sleepMillis: 0, evictMillis: 100, idleMillis: 1000, sweep: 'manual'},
      clock,
      botManager.manager,
      'test-server-id',
    );
    setTestGameLoader(instance);
    database = new TestDatabase();
    setTestDatabase(database);
    const player = TestPlayer.BLUE.newPlayer();
    const player2 = TestPlayer.RED.newPlayer();
    game = Game.newInstance('gameid', [player, player2], player, 'spectatorid');
    instance.resetForTesting();
  });
  afterEach(() => {
    restoreTestDatabase();
    restoreTestGameLoader();
  });

  it('uses shared instance', () => {
    expect(instance).to.eq(GameLoader.getInstance());
  });

  it('gets undefined when player does not exist', async () => {
    const game = await instance.getGame('player-doesnotexist');
    expect(game).is.undefined;
  });

  it('gets game when it exists in database', async () => {
    const game1 = await instance.getGame('gameid');
    expect(game1!.id).to.eq(game.id);
  });

  it('reconciles a persisted surrendered seat after restart', async () => {
    game.phase = Phase.ACTION;
    game.surrenderedPlayerIds.add(game.players[0].id);
    await database.saveGame(game);
    instance.resetForTesting();

    const result = await instance.reconcileSurrenderedBots();

    expect(result).deep.include({started: 1, alreadyActive: 0, failed: 0});
    expect(botManager.starts).deep.eq([{
      gameId: game.id,
      playerId: game.players[0].id,
      serverId: 'test-server-id',
    }]);
  });

  it('does not duplicate an active surrendered bot', async () => {
    game.phase = Phase.ACTION;
    game.surrenderedPlayerIds.add(game.players[0].id);
    await database.saveGame(game);
    botManager.active.add(game.players[0].id);
    instance.resetForTesting();

    const result = await instance.reconcileSurrenderedBots();

    expect(result).deep.include({started: 0, alreadyActive: 1, failed: 0});
    expect(botManager.starts).is.empty;
  });

  it('does not reconcile a finished game', async () => {
    game.phase = Phase.END;
    game.surrenderedPlayerIds.add(game.players[0].id);
    await database.saveGame(game);
    instance.resetForTesting();

    const result = await instance.reconcileSurrenderedBots();

    expect(result.started).eq(0);
    expect(botManager.starts).is.empty;
  });

  it('does not reconcile an original bot seat', async () => {
    game.phase = Phase.ACTION;
    game.botPlayerIds.add(game.players[0].id);
    game.surrenderedPlayerIds.add(game.players[0].id);
    await database.saveGame(game);
    instance.resetForTesting();

    const result = await instance.reconcileSurrenderedBots();

    expect(result.started).eq(0);
    expect(botManager.starts).is.empty;
  });

  it('reports a sanitized reconciliation failure', async () => {
    game.phase = Phase.ACTION;
    game.surrenderedPlayerIds.add(game.players[0].id);
    await database.saveGame(game);
    botOptions.startError = new Error('private spawn detail');
    instance.resetForTesting();

    const result = await instance.reconcileSurrenderedBots();

    expect(result.failed).eq(1);
    expect(result.started).eq(0);
  });

  it('gets no game when fails to deserialize from database', async () => {
    const originalDeserialize = Game.deserialize;
    Game.deserialize = () => {
      throw new Error('could not parse this');
    };
    try {
      const game1 = await instance.getGame('gameid');
      expect(game1).is.undefined;
    } finally {
      Game.deserialize = originalDeserialize;
    }
  });

  it('gets game when requested before database loaded', async () => {
    const game1 = instance.getGame('gameid');
    expect(game1).is.not.undefined;
  });

  it('gets player when requested before database loaded', async () => {
    const game1 = await instance.getGame(game.playersInGenerationOrder[0].id);
    expect(game1).is.not.undefined;
  });

  it('gets no game when game goes missing from database', async () => {
    const game1 = await instance.getGame('game-never');
    expect(game1).is.undefined;
    database.games.delete('gameid');
    const game2 = await instance.getGame('gameid');
    expect(game2).is.undefined;
  });

  it('gets player when it exists in database', async () => {
    const players = game.playersInGenerationOrder;
    const game1 = await instance.getGame(players[Math.floor(Math.random() * players.length)].id);
    expect(game1!.id).to.eq(game.id);
  });

  it('gets game when added and not in database', async () => {
    // Violating the readonly nature for this test. It ensures that no game with the specific ID is not in the loader.
    (game.id as GameId) = 'gameid-alpha';
    instance.add(game);
    const game1 = await instance.getGame('gameid-alpha');
    expect(game1!.id).to.eq('gameid-alpha');
  });

  it('gets player when added and not in database', async () => {
    const players = game.playersInGenerationOrder;
    instance.add(game);
    const game1 = await instance.getGame(players[Math.floor(Math.random() * players.length)]!.id);
    expect(game1).is.not.undefined;
    const list = await instance.getIds();
    expect(list).to.deep.eq(
      [{'gameId': 'gameid', 'participantIds': ['p-blue-id', 'p-red-id', 'spectatorid']}],
    );
  });

  it('loads values after error pulling game ids', async () => {
    database.failure = 'getParticipants';
    instance.resetForTesting();
    const game1 = await instance.getGame('gameid');
    expect(game1).is.undefined;
  });

  it('loads values when no game ids', async () => {
    database.games.delete('gameid');
    const game1 = await instance.getGame('gameid');
    expect(game1).is.undefined;
  });

  it('loads players that will never exist', async () => {
    const game1 = await instance.getGame('p-non-existent-id');
    expect(game1).is.undefined;
  });

  it('loads players available later', async () => {
    const game1 = await instance.getGame('gameid');
    expect(game1!.id).to.eq('gameid');
    const game2 = await GameLoader.getInstance().getGame(game.playersInGenerationOrder[0].id);
    expect(game2!.id).to.eq('gameid');
  });

  it('ignores orphan participant entries during preload', async () => {
    database.extraParticipants = [
      {gameId: 'ghost-gameid', participantIds: ['p-ghost-id1', 'p-ghost-id2']},
    ];
    instance.resetForTesting();

    const list = await instance.getIds();
    expect(list).to.deep.eq([
      {gameId: 'gameid', participantIds: ['p-blue-id', 'p-red-id', 'spectatorid']},
    ]);

    const orphan = await instance.getGame('ghost-gameid');
    expect(orphan).is.undefined;
  });

  it('waits for games to finish loading', async () => {
    // Set up a clean number of games;
    database.games.delete('gameid');
    const numberOfGames = 10;
    for (let i = 0; i < numberOfGames; i++) {
      const player = new Player('name', 'blue', false, 0, 'p-' + i as PlayerId);
      Game.newInstance('game-' + i as GameId, [player], player, 'spectatorid');
    }
    database.getGameSleep = 500;
    instance.resetForTesting();
    const list = await instance.getIds();
    expect(list?.map((e) => e.gameId)).to.have.members([
      'game-0', 'game-1', 'game-2', 'game-3', 'game-4',
      'game-5', 'game-6', 'game-7', 'game-8', 'game-9',
    ]);
  });

  it('tracks last access time', async () => {
    // A game that isn't resident has no last-access time.
    expect(await instance.isCached('gameid')).is.false;
    expect(instance.idleTimeMillis('gameid')).is.undefined;

    // Loading the game records the access time.
    clock.millis = 1000;
    await instance.getGame('gameid');
    expect(await instance.isCached('gameid')).is.true;
    expect(instance.idleTimeMillis('gameid')).eq(0);

    // As time passes, the idle time grows.
    clock.millis = 1250;
    expect(instance.idleTimeMillis('gameid')).eq(250);

    // Accessing the resident game again resets the idle time.
    await instance.getGame('gameid');
    expect(instance.idleTimeMillis('gameid')).eq(0);

    // Evicting the game drops its last-access time.
    instance.mark('gameid');
    clock.millis = 4000; // advance well past evictMillis (100)
    instance.sweep();
    expect(await instance.isCached('gameid')).is.false;
    expect(instance.idleTimeMillis('gameid')).is.undefined;
  });

  it('reports idle times for resident games', async () => {
    // No resident games, no idle times.
    expect(GameLoader.getIdleTimes()).is.empty;

    // A resident game reports zero idle time when just accessed.
    clock.millis = 1000;
    await instance.getGame('gameid');
    expect(GameLoader.getIdleTimes()).deep.eq([0]);

    // The idle time grows with the clock.
    clock.millis = 1600;
    expect(GameLoader.getIdleTimes()).deep.eq([600]);

    // Evicted games drop out of the reported idle times.
    instance.mark('gameid');
    clock.millis = 4000;
    instance.sweep();
    expect(GameLoader.getIdleTimes()).is.empty;
  });

  it('evicts finished game', async () => {
    const ids = await instance.getIds();
    expect(ids).deep.eq(
      [{
        'gameId': 'gameid',
        'participantIds': [
          'p-blue-id',
          'p-red-id',
          'spectatorid',
        ],
      }],
    );
    instance.resetForTesting();
    expect(await instance.isCached('gameid')).is.false;
    await instance.getGame('gameid');
    expect(await instance.isCached('gameid')).is.true;

    // In beforeEach, eviction time is 100ms.

    clock.millis = 5;
    instance.mark('gameid');
    instance.sweep();
    expect(await instance.isCached('gameid')).is.true;

    clock.millis = 104;
    instance.sweep();
    expect(await instance.isCached('gameid')).is.true;

    clock.millis = 105;
    instance.sweep();
    expect(await instance.isCached('gameid')).is.false;
  });

  it('sweep unloads games that are due for eviction', async () => {
    await instance.getGame('gameid');
    expect(await instance.isCached('gameid')).is.true;

    // Nothing is scheduled, so a sweep leaves the game resident.
    instance.sweep();
    expect(await instance.isCached('gameid')).is.true;

    instance.mark('gameid');
    clock.millis = 200; // advance past evictMillis (100)
    instance.sweep();

    // The game is unloaded from memory; it will lazily reload from the DB.
    expect(await instance.isCached('gameid')).is.false;
  });

  // Idle eviction only targets solo games; the shared `gameid` is multiplayer.
  function addSoloGame(id: GameId): void {
    const soloPlayer = new Player('solo', 'blue', false, 0, ('p-' + id) as PlayerId);
    Game.newInstance(id, [soloPlayer], soloPlayer, ('s' + id) as SpectatorId);
  }

  it('evicts a solo game idle past the threshold', async () => {
    addSoloGame('gsolo');
    instance.resetForTesting();

    clock.millis = 1000;
    await instance.getGame('gsolo');
    expect(await instance.isCached('gsolo')).is.true;

    // Idle for exactly idleMillis (1000) is not past the threshold.
    clock.millis = 2000;
    instance.sweep();
    expect(await instance.isCached('gsolo')).is.true;

    // One millisecond more and it's evicted.
    clock.millis = 2001;
    instance.sweep();
    expect(await instance.isCached('gsolo')).is.false;
  });

  it('keeps a solo game accessed within the threshold', async () => {
    addSoloGame('gsolo');
    instance.resetForTesting();

    clock.millis = 1000;
    await instance.getGame('gsolo');

    clock.millis = 1500; // idle 500ms, under idleMillis (1000)
    instance.sweep();
    expect(await instance.isCached('gsolo')).is.true;
  });

  it('accessing a solo game resets its idle time', async () => {
    addSoloGame('gsolo');
    instance.resetForTesting();

    clock.millis = 1000;
    await instance.getGame('gsolo');

    // Nearly idle, then accessed again, which resets the idle clock.
    clock.millis = 1900;
    await instance.getGame('gsolo');

    clock.millis = 2800; // 900ms since the last access, still under the threshold
    instance.sweep();
    expect(await instance.isCached('gsolo')).is.true;
  });

  it('does not evict idle games when idle eviction is disabled', async () => {
    addSoloGame('gsolo');
    const noIdle = GameLoader.newTestInstance({sleepMillis: 0, evictMillis: 100, idleMillis: 0, sweep: 'manual'}, clock);
    noIdle.resetForTesting();

    clock.millis = 1000;
    await noIdle.getGame('gsolo');

    clock.millis = 100000; // far past any threshold
    noIdle.sweep();
    expect(await noIdle.isCached('gsolo')).is.true;
  });

  it('does not idle-evict a solo game that is not abandoned', async () => {
    addSoloGame('gsolo');
    instance.resetForTesting();

    clock.millis = 1000;
    const loaded = await instance.getGame('gsolo');
    loaded!.lastSaveId = 4; // more than MAX_SAVES_FOR_IDLE_EVICTION (3)

    clock.millis = 100000; // far past the idle threshold
    instance.sweep();
    expect(await instance.isCached('gsolo')).is.true;
  });

  it('does not idle-evict a multiplayer game', async () => {
    clock.millis = 1000;
    await instance.getGame('gameid'); // gameid is a 2-player game

    clock.millis = 100000; // far past the idle threshold
    instance.sweep();
    expect(await instance.isCached('gameid')).is.true;
  });

  it('trims the log of a multiplayer game idle past the threshold', async () => {
    clock.millis = 1000;
    const loaded = await instance.getGame('gameid'); // gameid is a 2-player game
    expect(loaded!.gameLog.length).is.greaterThan(0);

    // Idle for exactly idleMillis (1000) is not past the threshold.
    clock.millis = 2000;
    instance.sweep();
    expect(loaded!.gameLog.length).is.greaterThan(0);

    // One millisecond more and the log is trimmed, but the game stays resident.
    clock.millis = 2001;
    instance.sweep();
    expect(await instance.isCached('gameid')).is.true;
    expect(loaded!.gameLog.length).eq(0);
  });

  it('restores a trimmed log from the database on next access', async () => {
    clock.millis = 1000;
    const loaded = await instance.getGame('gameid');
    const originalLog = [...loaded!.gameLog];
    expect(originalLog.length).is.greaterThan(0);

    clock.millis = 2001;
    instance.sweep();
    expect(loaded!.gameLog.length).eq(0);

    // Accessing the resident game reloads its log from the database.
    const reloaded = await instance.getGame('gameid');
    expect(reloaded).to.eq(loaded); // same resident object
    expect(reloaded!.gameLog).deep.eq(originalLog);
  });

  it('does not trim logs when idle eviction is disabled', async () => {
    const noIdle = GameLoader.newTestInstance({sleepMillis: 0, evictMillis: 100, idleMillis: 0, sweep: 'manual'}, clock);
    noIdle.resetForTesting();

    clock.millis = 1000;
    const loaded = await noIdle.getGame('gameid');
    expect(loaded!.gameLog.length).is.greaterThan(0);

    clock.millis = 100000; // far past any threshold
    noIdle.sweep();
    expect(loaded!.gameLog.length).is.greaterThan(0);
  });

  it('does not trim the log of a game evicted in the same sweep', async () => {
    addSoloGame('gsolo');
    instance.resetForTesting();

    clock.millis = 1000;
    const loaded = await instance.getGame('gsolo');
    expect(loaded!.gameLog.length).is.greaterThan(0);

    // Past the idle threshold: a solo game is fully evicted, not log-trimmed.
    clock.millis = 2001;
    instance.sweep();
    expect(await instance.isCached('gsolo')).is.false;
    // The evicted object keeps its own log; it will reload wholesale from the DB.
    expect(loaded!.gameLog.length).is.greaterThan(0);
  });

  it('accessing a game resets its idle time so the log is not trimmed', async () => {
    clock.millis = 1000;
    const loaded = await instance.getGame('gameid');

    // Nearly idle, then accessed again, which resets the idle clock.
    clock.millis = 1900;
    await instance.getGame('gameid');

    clock.millis = 2800; // 900ms since the last access, still under the threshold
    instance.sweep();
    expect(loaded!.gameLog.length).is.greaterThan(0);
  });

  it('restoreGameAt', async () => {
    game.generation = 12;
    game.save();

    expect(game.lastSaveId).eq(2);

    game.generation = 13;
    game.save();

    expect(game.lastSaveId).eq(3);
    game.save();

    game.generation = 14;
    expect(game.lastSaveId).eq(4);

    expect(await database.getSaveIds(game.id)).deep.eq([0, 1, 2, 3]);

    const newGame = await instance.restoreGameAt(game.id, 2);

    expect(newGame.generation).eq(13);
    // This may seem strange, but what's happening is that the save id is
    // incremented at the end of save(). It loads #2, and increments.
    expect(newGame.lastSaveId).eq(3);
    expect(await database.getSaveIds(game.id)).deep.eq([0, 1, 2]);
  });

  it('getGameAt loads a saved version without restoring it', async () => {
    game.generation = 12;
    game.save();
    await game.saveGamePromise;

    game.generation = 13;
    game.save();
    await game.saveGamePromise;
    await instance.add(game);

    const savedGame = await instance.getGameAt(game.id, 1);
    const currentGame = await instance.getGame(game.id);

    expect(savedGame.generation).eq(12);
    expect(currentGame!.generation).eq(13);
    expect(await database.getSaveIds(game.id)).deep.eq([0, 1, 2]);
  });

  it('restoreGameAt appends canceled log messages from the restored action', async () => {
    game.gameLog.length = 0;
    game.gameAge = 0;
    game.log('Generation ${0}', (b) => b.forNewGeneration().number(1));
    game.log('Kept action');
    game.save();
    await game.saveGamePromise;
    const saves = database.games.get(game.id)!;
    saves[1] = JSON.parse(JSON.stringify(saves[1]));

    game.log('Canceled action');
    game.save();
    await game.saveGamePromise;
    await instance.add(game);

    const newGame = await instance.restoreGameAt(game.id, 1);

    expect(newGame.gameLog.map((message) => message.message)).deep.eq([
      'Generation ${0}',
      'Kept action',
      'Canceled action',
    ]);
    expect(newGame.gameLog[2].canceled).eq(true);
    expect(newGame.gameAge).eq(3);
  });

  it('saveGame', async () => {
    game.generation = 12;
    instance.saveGame(game);

    expect(game.lastSaveId).eq(2);

    game.generation = 13;
    instance.saveGame(game);

    expect(await database.getSaveIds(game.id)).deep.eq([0, 1, 2]);
  });


  it('saveGame, already deleted', async () => {
    game.generation = 12;
    instance.saveGame(game);

    expect(game.lastSaveId).eq(2);

    game.generation = 13;
    instance.saveGame(game);

    database.markFinished(game.id);
    database.compressCompletedGames();
  });

  it('completeGame', () => {

  });
});
