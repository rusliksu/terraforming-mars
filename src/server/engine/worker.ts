/**
 * Worker-safe entry point for the host-neutral engine facade.
 *
 * Importing this module must not load `Database`, `GameLoader`, `TelegramBot`,
 * routes, or Node filesystem/network adapters. The import-graph test enforces
 * that boundary.
 */
export {EngineFacade, EngineHandle} from './EngineFacade';
export type {EnginePromptState} from './EngineFacade';
export {EngineInputError, UnsupportedEngineConfigError} from './EngineErrors';
export {
  canonicalEngineState,
  canonicalHash,
  engineStateHash,
  promptFingerprint,
  promptSnapshot,
  promptViewModel,
  stableStringify,
} from './EngineCanonical';
export type {EnginePromptSnapshot} from './EngineCanonical';
export {
  assertSupportedSnapshot,
  validateEngineConfig,
} from './EngineConfig';
export type {
  EngineConfig,
  EngineGameOptionsConfig,
  EnginePlayerConfig,
  ValidatedEngineConfig,
} from './EngineConfig';
export {
  createDeterministicEngineDependencies,
  FixedClock,
  InMemoryPersistence,
  NOOP_ENGINE_NOTIFIER,
  SeededRandomProvider,
  SequentialIdSource,
} from './EngineDependencies';
export type {DeterministicEngineDependenciesOptions} from './EngineDependencies';
export {
  replayOrderedInputs,
  replayParityFingerprint,
} from './DeterministicReplay';
export type {
  OrderedEngineInput,
  ReplayResult,
  ReplayStep,
} from './DeterministicReplay';
export type {
  EngineClock,
  EngineDependencies,
  EngineIdSource,
  EngineNotifierPort,
  EnginePersistencePort,
  EngineRandomProvider,
  EngineRuntime,
} from './EngineRuntime';
