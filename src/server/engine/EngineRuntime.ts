import type {GameId, PlayerId, SpectatorId} from '../../common/Types';
import type {SeededRandom} from '../../common/utils/Random';
import type {IPlayer} from '../IPlayer';
import type {PlayerInput} from '../PlayerInput';
import type {SerializedGame} from '../SerializedGame';

/** Host-provided wall clock. The engine never reads the system clock directly. */
export interface EngineClock {
  now(): number;
}

/** Host-provided identifier source. Identifiers are data, never generated inside the engine. */
export interface EngineIdSource {
  nextGameId(): GameId;
  nextSpectatorId(): SpectatorId;
  nextPlayerId(): PlayerId;
}

/** Host-provided random source. A new deterministic instance is created per game. */
export interface EngineRandomProvider {
  create(seed: number, currentSeed?: number): SeededRandom;
}

/**
 * Persistence port for the engine.
 *
 * The engine calls this instead of `Database`/`GameLoader`. A worker or replay
 * host can supply an in-memory/no-op implementation.
 */
export interface EnginePersistencePort {
  save(snapshot: SerializedGame): Promise<void>;
  markCompleted?(gameId: GameId): void;
}

/**
 * Notification port for player turn changes.
 *
 * When supplied, the player delegates turn-notice handling here instead of
 * loading the Telegram adapter, scheduling timers, or touching the filesystem.
 */
export interface EngineNotifierPort {
  waitingFor?(player: IPlayer, input: PlayerInput): void;
  inputProcessed?(player: IPlayer): void;
  gameEnded?(gameId: GameId): void;
}

/** Runtime dependencies used by `Game` and `Player`. */
export interface EngineRuntime {
  readonly clock: EngineClock;
  readonly random: EngineRandomProvider;
  readonly persistence: EnginePersistencePort;
  readonly notifier: EngineNotifierPort;
}

/** Full dependency set used by the facade. */
export interface EngineDependencies extends EngineRuntime {
  readonly ids: EngineIdSource;
}
