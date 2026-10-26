import {SeededRandom} from '../../common/utils/Random';
import {GameId, PlayerId, SpectatorId} from '../../common/Types';
import type {
  EngineClock,
  EngineDependencies,
  EngineIdSource,
  EngineNotifierPort,
  EnginePersistencePort,
  EngineRandomProvider,
} from './EngineRuntime';

export class FixedClock implements EngineClock {
  private currentMs: number;

  public constructor(initialMs: number = 0) {
    this.currentMs = initialMs;
  }

  public now(): number {
    return this.currentMs;
  }

  public advance(ms: number): void {
    this.currentMs += ms;
  }
}

export class SequentialIdSource implements EngineIdSource {
  private gameCounter = 0;
  private spectatorCounter = 0;
  private playerCounter = 0;

  public constructor(private readonly prefix: string = 'engine') {}

  public nextGameId(): GameId {
    this.gameCounter++;
    return `${this.prefix}-game-${this.gameCounter}` as GameId;
  }

  public nextSpectatorId(): SpectatorId {
    this.spectatorCounter++;
    return `${this.prefix}-spectator-${this.spectatorCounter}` as SpectatorId;
  }

  public nextPlayerId(): PlayerId {
    this.playerCounter++;
    return `${this.prefix}-player-${this.playerCounter}` as PlayerId;
  }
}

export class SeededRandomProvider implements EngineRandomProvider {
  public create(seed: number, currentSeed?: number): SeededRandom {
    return new SeededRandom(seed, currentSeed);
  }
}

export class InMemoryPersistence implements EnginePersistencePort {
  public saveCount = 0;
  public lastSnapshot: unknown = undefined;
  public completedGameIds: Array<GameId> = [];

  public save(snapshot: unknown): Promise<void> {
    this.saveCount++;
    this.lastSnapshot = snapshot;
    return Promise.resolve();
  }

  public markCompleted(gameId: GameId): void {
    this.completedGameIds.push(gameId);
  }
}

export const NOOP_ENGINE_NOTIFIER: EngineNotifierPort = Object.freeze({});

export interface DeterministicEngineDependenciesOptions {
  nowMs?: number;
  idPrefix?: string;
}

/**
 * Dependencies suitable for replay tests and a worker process: deterministic
 * clock, sequential IDs, seeded RNG, in-memory persistence, and no notifier.
 */
export function createDeterministicEngineDependencies(
  options: DeterministicEngineDependenciesOptions = {},
): EngineDependencies {
  return {
    clock: new FixedClock(options.nowMs ?? 0),
    ids: new SequentialIdSource(options.idPrefix ?? 'engine'),
    random: new SeededRandomProvider(),
    persistence: new InMemoryPersistence(),
    notifier: NOOP_ENGINE_NOTIFIER,
  };
}
