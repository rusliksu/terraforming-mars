import {Color, PLAYER_COLORS} from '../../common/Color';
import {EXPANSIONS, Expansion} from '../../common/cards/GameModule';
import {DEFAULT_GAME_OPTIONS, GameOptions} from '../game/GameOptions';
import {SerializedGame} from '../SerializedGame';
import {UnsupportedEngineConfigError} from './EngineErrors';

export interface EnginePlayerConfig {
  name: string;
  color: Color;
  beginner?: boolean;
  handicap?: number;
  preludeHandicap?: number;
}

/**
 * The first supported engine slice: base + Prelude only.
 *
 * This patch is intentionally narrow. Every other option, card list, expansion,
 * variant, or board customization fails closed in `validateEngineConfig`.
 */
export interface EngineGameOptionsConfig {
  preludeExtension?: true;
  corporateEra?: false;
  expansions?: Partial<Record<Expansion, boolean>>;
}

export interface EngineConfig {
  version: 1;
  seed: number;
  players: ReadonlyArray<EnginePlayerConfig>;
  gameOptions?: EngineGameOptionsConfig;
}

export interface ValidatedEngineConfig {
  seed: number;
  players: ReadonlyArray<EnginePlayerConfig>;
  gameOptions: Partial<GameOptions>;
}

const SUPPORTED_CONFIG_KEYS = new Set(['version', 'seed', 'players', 'gameOptions']);
const SUPPORTED_PLAYER_KEYS = new Set(['name', 'color', 'beginner', 'handicap', 'preludeHandicap']);
const SUPPORTED_OPTION_KEYS = new Set(['preludeExtension', 'corporateEra', 'expansions']);
const KNOWN_PLAYER_COLORS = new Set<string>(PLAYER_COLORS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertSupportedExpansionMap(value: unknown): Partial<Record<Expansion, boolean>> {
  if (!isRecord(value)) {
    throw new UnsupportedEngineConfigError('gameOptions.expansions must be an object');
  }
  for (const [key, enabled] of Object.entries(value)) {
    if (!EXPANSIONS.includes(key as Expansion)) {
      throw new UnsupportedEngineConfigError(`Unsupported expansion '${key}'`);
    }
    if (typeof enabled !== 'boolean') {
      throw new UnsupportedEngineConfigError(`gameOptions.expansions.${key} must be boolean`);
    }
    if (key !== 'prelude' && enabled) {
      throw new UnsupportedEngineConfigError(`Unsupported expansion '${key}': only base + Prelude is supported`);
    }
  }
  if (value.prelude === false) {
    throw new UnsupportedEngineConfigError('Prelude must stay enabled for the base + Prelude engine');
  }
  return value as Partial<Record<Expansion, boolean>>;
}

/**
 * Validates and normalizes an external engine config.
 *
 * Unknown option keys, non-base expansions, card lists, variants, and invalid
 * player/seed data throw `UnsupportedEngineConfigError` before any game state
 * is constructed. This is deliberate fail-closed behavior for the first slice.
 */
export function validateEngineConfig(config: unknown): ValidatedEngineConfig {
  if (!isRecord(config)) {
    throw new UnsupportedEngineConfigError('Engine config must be an object');
  }
  for (const key of Object.keys(config)) {
    if (!SUPPORTED_CONFIG_KEYS.has(key)) {
      throw new UnsupportedEngineConfigError(`Unsupported engine config field '${key}'`);
    }
  }
  if (config.version !== 1) {
    throw new UnsupportedEngineConfigError(`Unsupported engine config version: ${String(config.version)}`);
  }
  if (typeof config.seed !== 'number' || !Number.isSafeInteger(config.seed) || config.seed < 0 || config.seed > 0xFFFFFFFF) {
    throw new UnsupportedEngineConfigError('seed must be a safe integer in [0, 0xFFFFFFFF]');
  }
  if (!Array.isArray(config.players) || config.players.length < 1 || config.players.length > 5) {
    throw new UnsupportedEngineConfigError('players must contain between 1 and 5 players');
  }
  const players: Array<EnginePlayerConfig> = [];
  const colors = new Set<string>();
  for (const [index, rawPlayer] of config.players.entries()) {
    if (!isRecord(rawPlayer)) {
      throw new UnsupportedEngineConfigError(`players[${index}] must be an object`);
    }
    for (const key of Object.keys(rawPlayer)) {
      if (!SUPPORTED_PLAYER_KEYS.has(key)) {
        throw new UnsupportedEngineConfigError(`Unsupported players[${index}] field '${key}'`);
      }
    }
    if (typeof rawPlayer.name !== 'string' || rawPlayer.name.trim() === '') {
      throw new UnsupportedEngineConfigError(`players[${index}].name must be a non-empty string`);
    }
    if (typeof rawPlayer.color !== 'string' || !KNOWN_PLAYER_COLORS.has(rawPlayer.color)) {
      throw new UnsupportedEngineConfigError(`players[${index}].color is not a supported player color`);
    }
    if (rawPlayer.beginner !== undefined && typeof rawPlayer.beginner !== 'boolean') {
      throw new UnsupportedEngineConfigError(`players[${index}].beginner must be boolean`);
    }
    if (colors.has(rawPlayer.color)) {
      throw new UnsupportedEngineConfigError(`Duplicate player color: ${rawPlayer.color}`);
    }
    colors.add(rawPlayer.color);
    const handicap = rawPlayer.handicap ?? 0;
    const preludeHandicap = rawPlayer.preludeHandicap ?? 2;
    if (typeof handicap !== 'number' || !Number.isInteger(handicap) || handicap < 0) {
      throw new UnsupportedEngineConfigError(`players[${index}].handicap must be a non-negative integer`);
    }
    if (typeof preludeHandicap !== 'number' || !Number.isInteger(preludeHandicap) || preludeHandicap < 0) {
      throw new UnsupportedEngineConfigError(`players[${index}].preludeHandicap must be a non-negative integer`);
    }
    players.push({
      name: rawPlayer.name,
      color: rawPlayer.color as Color,
      beginner: rawPlayer.beginner === true,
      handicap,
      preludeHandicap,
    });
  }

  const rawOptions = config.gameOptions;
  const expansions: Record<Expansion, boolean> = Object.fromEntries(
    EXPANSIONS.map((expansion) => [expansion, false]),
  ) as Record<Expansion, boolean>;
  expansions.prelude = true;

  if (rawOptions !== undefined) {
    if (!isRecord(rawOptions)) {
      throw new UnsupportedEngineConfigError('gameOptions must be an object');
    }
    for (const key of Object.keys(rawOptions)) {
      if (!SUPPORTED_OPTION_KEYS.has(key)) {
        throw new UnsupportedEngineConfigError(`Unsupported game option '${key}' for the base + Prelude engine`);
      }
    }
    if (rawOptions.preludeExtension !== undefined && rawOptions.preludeExtension !== true) {
      throw new UnsupportedEngineConfigError('preludeExtension must be true');
    }
    if (rawOptions.corporateEra !== undefined && rawOptions.corporateEra !== false) {
      throw new UnsupportedEngineConfigError('corporateEra is not supported in the base + Prelude engine');
    }
    if (rawOptions.expansions !== undefined) {
      Object.assign(expansions, assertSupportedExpansionMap(rawOptions.expansions));
    }
  }

  return {
    seed: config.seed,
    players,
    gameOptions: {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: false,
      preludeExtension: true,
      expansions,
    },
  };
}

const UNSUPPORTED_EXPANSION_FLAGS: ReadonlyArray<keyof GameOptions> = [
  'prelude2Expansion',
  'venusNextExtension',
  'coloniesExtension',
  'turmoilExtension',
  'promoCardsOption',
  'communityCardsOption',
  'aresExtension',
  'moonExpansion',
  'pathfindersExpansion',
  'ceoExtension',
  'starWarsExpansion',
  'underworldExpansion',
  'deltaProjectExpansion',
];

/**
 * Validates a serialized snapshot before handing it to the engine.
 *
 * The facade refuses snapshots that contain state from unsupported modules. It
 * does not claim to restore deferred actions or `waitingFor` beyond what
 * `Game.deserialize` supports today.
 */
export function assertSupportedSnapshot(snapshot: SerializedGame): void {
  const options = snapshot.gameOptions;
  if (options === undefined) {
    throw new UnsupportedEngineConfigError('Snapshot has no gameOptions');
  }
  if (options.preludeExtension !== true) {
    throw new UnsupportedEngineConfigError('Snapshot is not a Prelude game');
  }
  if (options.corporateEra !== false) {
    throw new UnsupportedEngineConfigError('Snapshot uses Corporate Era, which is outside this slice');
  }
  if (options.expansions === undefined || typeof options.expansions !== 'object') {
    throw new UnsupportedEngineConfigError('Snapshot has no expansion map');
  }
  for (const flag of UNSUPPORTED_EXPANSION_FLAGS) {
    if (options[flag] === true) {
      throw new UnsupportedEngineConfigError(`Snapshot uses unsupported option '${String(flag)}'`);
    }
  }
  for (const expansion of EXPANSIONS) {
    if (expansion !== 'prelude' && options.expansions[expansion] === true) {
      throw new UnsupportedEngineConfigError(`Snapshot uses unsupported expansion '${expansion}'`);
    }
  }
  if (options.clonedGamedId !== undefined) {
    throw new UnsupportedEngineConfigError('Cloned games are outside this slice');
  }
  if (options.twoCorpsVariant === true || options.escapeVelocity !== undefined) {
    throw new UnsupportedEngineConfigError('Snapshot uses an unsupported variant');
  }
}
