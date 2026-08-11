import prometheus from 'prom-client';
import {Database} from './Database';
import {Game} from '../Game';
import {IGame} from '../IGame';
import {PlayerId, GameId, SpectatorId, isGameId, ParticipantId} from '../../common/Types';
import {IGameLoader} from './IGameLoader';
import {GameIdLedger} from './IDatabase';
import {Cache} from './Cache';
import {MultiMap} from 'mnemonist';
import {timeAsync} from '../utils/timer';
import {durationToMilliseconds} from '../utils/durations';
import {CacheConfig} from './CacheConfig';
import {Clock} from '../../common/Timer';
import {EloSyncService} from '../elo/EloSyncService';
import {appendCanceledLogMessages} from '../logs/appendCanceledLogMessages';
import {Phase} from '../../common/Phase';
import {BotTakeoverManager} from '../bot/BotTakeoverManager';
import type {SurrenderBotManager} from '../surrender/SurrenderService';
import {serverId} from '../utils/server-ids';

export type SurrenderBotReconciliationResult = {
  scanned: number;
  started: number;
  alreadyActive: number;
  failed: number;
};

const metrics = {
  initialize: new prometheus.Gauge({
    name: 'gameloader_initialize',
    help: 'Time to load all games',
    registers: [prometheus.register],
  }),
  evictions: new prometheus.Counter({
    name: 'gameloader_evictions',
    help: 'Game evictions count',
    registers: [prometheus.register],
  }),
  logsTrimmed: new prometheus.Counter({
    name: 'game_log_trimmed',
    help: 'Number of resident game logs dropped from memory while idle',
    registers: [prometheus.register],
  }),
  logsRestored: new prometheus.Counter({
    name: 'game_log_restored',
    help: 'Number of resident game logs reloaded from the database on access',
    registers: [prometheus.register],
  }),
  gamesCreated: new prometheus.Counter({
    name: 'game_created',
    help: 'Number of games created',
    labelNames: ['players'] as const,
    registers: [prometheus.register],
  }),
  gamesFinished: new prometheus.Counter({
    name: 'game_finished',
    help: 'Number of games finished',
    labelNames: ['players'] as const,
    registers: [prometheus.register],
  }),
  gamesPurged: new prometheus.Counter({
    name: 'game_purged',
    help: 'Number of games deleted because they are too old',
    labelNames: ['players'] as const,
    registers: [prometheus.register],
  }),
  gamesInMemory: new prometheus.Gauge({
    name: 'games_in_memory',
    help: 'Number of games currently loaded in memory',
    labelNames: ['has_log'] as const,
    registers: [prometheus.register],
    collect() {
      const counts = GameLoader.getLoadedGameCount();
      this.set({has_log: 'true'}, counts.untrimmed);
      this.set({has_log: 'false'}, counts.trimmed);
    },
  }),
  idleTime: new prometheus.Gauge({
    name: 'games_idle_time_seconds',
    help: 'Point-in-time distribution of idle time (seconds since last access) across games resident in memory, as cumulative histogram-style buckets. This is a snapshot gauge, not a cumulative histogram.',
    labelNames: ['le'] as const,
    registers: [prometheus.register],
    collect() {
      GameLoader.collectIdleTimes(this);
    },
  }),
};

/**
 * Loads games from javascript memory or database
 * Loads games from database sequentially as needed
 */
export class GameLoader implements IGameLoader {
  private static instance: GameLoader;

  private cache: Cache;
  private readonly config: CacheConfig;
  private readonly clock: Clock;
  private readonly botTakeoverManager: SurrenderBotManager;
  private readonly botServerId: string;
  private purgedGames: Array<GameId>;

  private constructor(
    config: CacheConfig,
    clock: Clock,
    botTakeoverManager: SurrenderBotManager = BotTakeoverManager.INSTANCE,
    botServerId: string = serverId,
  ) {
    this.config = config;
    this.clock = clock;
    this.botTakeoverManager = botTakeoverManager;
    this.botServerId = botServerId;
    this.cache = new Cache(config, clock);
    this.cache.on('evicted', (count: number) => metrics.evictions.inc(count));
    this.cache.on('trimmed', (count: number) => metrics.logsTrimmed.inc(count));
    this.purgedGames = [];
    timeAsync(this.cache.load())
      .then((v) => {
        metrics.initialize.set(v.duration);
      });
  }

  public static getInstance(): IGameLoader {
    if (!GameLoader.instance) {
      const config = parseConfigString(process.env.GAME_CACHE ?? '');
      GameLoader.instance = new GameLoader(config, new Clock());
    }
    return GameLoader.instance;
  }

  public static reconcileSurrenderedBots(): Promise<SurrenderBotReconciliationResult> {
    const instance = GameLoader.getInstance();
    if (!(instance instanceof GameLoader)) {
      return Promise.resolve(emptySurrenderBotReconciliationResult());
    }
    return instance.reconcileSurrenderedBots();
  }

  public static newTestInstance(
    config: CacheConfig,
    clock: Clock,
    botTakeoverManager: SurrenderBotManager = BotTakeoverManager.INSTANCE,
    botServerId: string = serverId,
  ): GameLoader {
    return new GameLoader(config, clock, botTakeoverManager, botServerId);
  }

  public static getLoadedGameCount(): {trimmed: number, untrimmed: number} {
    return GameLoader.instance?.cache.countLoadedGames() ?? {trimmed: 0, untrimmed: 0};
  }

  public static getIdleTimes(): Array<number> {
    const loader = GameLoader.getInstance();
    return loader instanceof GameLoader ? loader.cache.idleTimes() : [];
  }

  // Populates `gauge` with the cumulative histogram-style distribution of
  // resident-game idle time (seconds since last access) across fixed buckets.
  public static collectIdleTimes(gauge: prometheus.Gauge<'le'>): void {
    const bucketBoundsSeconds = [60, 300, 900, 1800, 3600, 10800, 21600, 86400, Infinity];
    const idleSeconds = GameLoader.getIdleTimes().map((millis) => millis / 1000);
    for (const le of bucketBoundsSeconds) {
      const count = idleSeconds.filter((seconds) => seconds <= le).length;
      gauge.set({le: le === Infinity ? '+Inf' : String(le)}, count);
    }
  }

  public resetForTesting(): void {
    this.cache = new Cache(this.config, this.clock);
    this.cache.load();
  }

  /**
   * Returns the time in milliseconds since `gameId` was last accessed, or
   * undefined if the game is not resident in memory.
   */
  public idleTimeMillis(gameId: GameId): number | undefined {
    return this.cache.idleTimeMillis(gameId);
  }

  public async add(game: IGame): Promise<void> {
    const d = await this.cache.getGames();
    const isNew = !d.games.has(game.id);
    d.games.set(game.id, game);
    this.cache.touch(game.id);
    if (game.spectatorId !== undefined) {
      d.participantIds.set(game.spectatorId, game.id);
    }
    for (const player of game.players) {
      d.participantIds.set(player.id, game.id);
    }
    if (isNew) {
      metrics.gamesCreated.inc({players: String(game.players.length)});
    }
  }

  public async getIds(): Promise<Array<GameIdLedger>> {
    const d = await this.cache.getGames();
    const map = new MultiMap<GameId, ParticipantId>();
    d.participantIds.forEach((gameId, participantId) => map.set(gameId, participantId));
    const arry: Array<[GameId, Array<PlayerId | SpectatorId>]> = Array.from(map.associations());
    return arry.map(([gameId, participantIds]) => ({gameId, participantIds}));
  }

  public getLastSaveTimeMs(gameId: GameId): Promise<number | undefined> {
    return Database.getInstance().getLastSaveTimeMs(gameId);
  }

  public getLastSaveTimesMs(gameIds: Array<GameId>): Promise<Map<GameId, number | undefined>> {
    return Database.getInstance().getLastSaveTimesMs(gameIds);
  }

  public async isCached(gameId: GameId): Promise<boolean> {
    const d = await this.cache.getGames();
    return d.games.get(gameId) !== undefined;
  }

  public async getGame(id: GameId | PlayerId | SpectatorId, forceLoad: boolean = false): Promise<IGame | undefined> {
    const d = await this.cache.getGames();
    const gameId = isGameId(id) ? id : d.participantIds.get(id);
    if (gameId === undefined) {
      return undefined;
    }

    // 1. Check the cache as long as forceLoad isn't true.
    const cached = d.games.get(gameId);
    if (forceLoad === false && cached !== undefined) {
      this.cache.touch(gameId);
      // An idle sweep may have dropped the log to save memory (see Cache.trimIdleLogs).
      // Reload it from the database before returning so callers never see or persist a
      // truncated log.
      if (cached.gameLog.length === 0) {
        await this.restoreGameLog(cached);
      }
      this.reconcileGame(cached);
      return cached;
    }

    // 2. The game isn't cached. If it's in the database, there will still be an entry
    // for it in the cache.
    if (d.games.has(gameId)) {
      try {
        const serializedGame = await Database.getInstance().getGame(gameId);
        if (serializedGame === undefined) {
          console.error(`GameLoader:loadGame: game ${gameId} not found`);
          return undefined;
        }
        const game = Game.deserialize(serializedGame);
        await this.add(game);
        this.reconcileGame(game);
        console.log(`GameLoader loaded game ${gameId} into memory from database`);
        return game;
      } catch (e) {
        console.error('GameLoader:loadGame', e);
        return undefined;
      }
    }

    // Otherwise the game ID isn't valid.
    return undefined;
  }

  public async reconcileSurrenderedBots(): Promise<SurrenderBotReconciliationResult> {
    const result = emptySurrenderBotReconciliationResult();
    const ids = await this.getIds();
    const database = Database.getInstance();

    for (const {gameId} of ids) {
      result.scanned++;
      try {
        const serialized = await database.getGame(gameId);
        if (serialized.phase === Phase.END || (serialized.surrenderedPlayerIds?.length ?? 0) === 0) {
          continue;
        }
        const game = Game.deserialize(serialized);
        await this.add(game);
        mergeSurrenderBotReconciliationResult(result, this.reconcileGame(game));
      } catch (_error) {
        result.failed++;
        console.error('Unable to inspect game during surrender bot reconciliation', {gameId});
      }
    }

    console.info('Surrender bot reconciliation completed', result);
    return result;
  }

  private reconcileGame(game: IGame): SurrenderBotReconciliationResult {
    const result = emptySurrenderBotReconciliationResult();
    if (game.phase === Phase.END) {
      return result;
    }

    for (const playerId of game.surrenderedPlayerIds) {
      if (game.botPlayerIds.has(playerId)) {
        continue;
      }
      if (this.botTakeoverManager.isActive(playerId)) {
        result.alreadyActive++;
        continue;
      }
      try {
        game.getPlayerById(playerId);
        this.botTakeoverManager.start({gameId: game.id, playerId, serverId: this.botServerId});
        result.started++;
      } catch (_error) {
        result.failed++;
        console.error('Unable to reconcile surrendered bot', {gameId: game.id});
      }
    }
    return result;
  }

  /**
   * Reloads the `gameLog` for a resident game whose log was dropped by an idle sweep.
   * The database copy always retains the full log; we read that copy and move its log
   * onto the live game object rather than deserializing the whole game.
   */
  private async restoreGameLog(game: IGame): Promise<void> {
    const serializedGame = await Database.getInstance().getGame(game.id);
    game.gameLog = serializedGame.gameLog;
    metrics.logsRestored.inc();
  }

  public async getGameAt(gameId: GameId, saveId: number): Promise<IGame> {
    const serializedGame = await Database.getInstance().getGameVersion(gameId, saveId);
    return Game.deserialize(serializedGame);
  }

  public async getGameAtOrBefore(gameId: GameId, saveId: number): Promise<IGame> {
    return this.getGameAt(gameId, await this.getSaveIdAtOrBefore(gameId, saveId));
  }

  public async restoreGameAt(gameId: GameId, saveId: number): Promise<IGame> {
    const current = await this.getGame(gameId);
    if (current === undefined) {
      console.error('GameLoader cannot find game ' + gameId);
      throw new Error('Cannot find game');
    }
    const database = Database.getInstance();
    const restoreSaveId = await this.getSaveIdAtOrBefore(gameId, saveId);
    const saveIds = await database.getSaveIds(gameId);
    const deletes = saveIds.filter((id) => id > restoreSaveId).length;
    if (deletes > 0) {
      await database.deleteGameNbrSaves(gameId, deletes);
    }
    const serializedGame = await database.getGameVersion(gameId, restoreSaveId);
    const game = Game.deserialize(serializedGame);
    appendCanceledLogMessages(current, game);
    await this.add(game);
    game.undoCount++;
    return game;
  }

  private async getSaveIdAtOrBefore(gameId: GameId, saveId: number): Promise<number> {
    const saveIds = await Database.getInstance().getSaveIds(gameId);
    const resolvedSaveId = saveIds
      .filter((id) => id <= saveId)
      .sort((a, b) => b - a)[0];
    if (resolvedSaveId === undefined) {
      throw new Error(`Game ${gameId} not found at or before save_id ${saveId}`);
    }
    return resolvedSaveId;
  }

  public mark(gameId: GameId) {
    this.cache.mark(gameId);
  }

  public sweep(): void {
    this.cache.sweep();
  }

  public async completeGame(game: IGame) {
    const database = Database.getInstance();
    await database.saveGame(game);
    try {
      this.mark(game.id);
      await database.markFinished(game.id);
      await EloSyncService.getInstance().recordCompletedGame(game);
      metrics.gamesFinished.inc({players: String(game.players.length)});
      await this.maintenance();
    } catch (err) {
      console.error(err);
    }
  }

  public saveGame(game: IGame): Promise<void> {
    if (this.purgedGames.includes(game.id)) {
      throw new Error('This game no longer exists');
    }
    return Database.getInstance().saveGame(game);
  }

  public async maintenance() {
    const database = Database.getInstance();
    const purgedGames = await database.purgeUnfinishedGames();
    this.purgedGames.push(...purgedGames);
    metrics.gamesPurged.inc(purgedGames.length);
    await database.compressCompletedGames();
  }
}

function emptySurrenderBotReconciliationResult(): SurrenderBotReconciliationResult {
  return {scanned: 0, started: 0, alreadyActive: 0, failed: 0};
}

function mergeSurrenderBotReconciliationResult(
  target: SurrenderBotReconciliationResult,
  source: SurrenderBotReconciliationResult,
): void {
  target.started += source.started;
  target.alreadyActive += source.alreadyActive;
  target.failed += source.failed;
}

function parseConfigString(stringValue: string): CacheConfig {
  const options: CacheConfig = {
    sweep: 'manual', // default is manual
    evictMillis: durationToMilliseconds('15m'),
    sleepMillis: durationToMilliseconds('5m'),
    idleMillis: durationToMilliseconds('1h'),
  };
  const parsed = Object.fromEntries((stringValue ?? '').split(';').map((s) => s.split('=', 2)));
  if (parsed.sweep === 'auto' || parsed.sweep === 'manual') {
    options.sweep = parsed.sweep;
  } else if (parsed.sweep !== undefined) {
    throw new Error('invalid sweep option from GAME_CACHE: ' + parsed.sweep);
  }
  const evictMillis = durationToMilliseconds(parsed.eviction_age);
  if (!isNaN(evictMillis)) {
    options.evictMillis = evictMillis;
  }
  const sleepMillis = durationToMilliseconds(parsed.sweep_freq);
  if (!isNaN(sleepMillis)) {
    options.sleepMillis = sleepMillis;
  }
  // Set idle_age=0s to disable idle eviction; a bare 0 parses to NaN and is ignored.
  const idleMillis = durationToMilliseconds(parsed.idle_age);
  if (!isNaN(idleMillis)) {
    options.idleMillis = idleMillis;
  }
  return options;
}
