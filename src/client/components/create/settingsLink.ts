import type {JSONObject, JSONValue} from '@/common/Types';
import type {CreateGameModel} from './CreateGameModel';
import {defaultCreateGameModel} from './defaultCreateGameModel';
import {TemplateManager, TEMPLATE_SCALAR_FIELD_TYPES} from './TemplateManager';
import {DEFAULT_EXPANSIONS, EXPANSIONS} from '@/common/cards/GameModule';
import {PLAYER_COLORS} from '@/common/Color';
import {BoardName} from '@/common/boards/BoardName';
import {RandomBoardOption} from '@/common/boards/RandomBoardOption';
import {RandomMAOptionType} from '@/common/ma/RandomMAOptionType';
import {CardName} from '@/common/cards/CardName';
import {ColonyName} from '@/common/colonies/ColonyName';
import {CARD_RENAMES} from '@/common/cards/CardRenames';
import {decodeCustomBoard} from '@/common/boards/customBoardCodec';
import {decodeSimpleBoard} from '@/common/boards/simpleBoardCodec';
import type {AgendaStyle} from '@/common/turmoil/Types';

const PREFIX = '#tm-settings=';
const VERSION = '1.';
const MAX_BYTES = 100_000;
const CARD_FIELDS = ['customCorporations', 'customPreludes', 'customCeos', 'bannedCards', 'includedCards',
  'customCorporationExclusions', 'customPreludesExclusions'] as const;
const COLONY_FIELDS = ['customColonies', 'customColonyExclusions'] as const;
const FIELD_TYPES = {...TEMPLATE_SCALAR_FIELD_TYPES, firstIndex: 'number', seed: 'number'} as const;
const CARD_NAMES: ReadonlySet<string> = new Set(Object.values(CardName));
const COLONY_NAMES: ReadonlySet<string> = new Set(Object.values(ColonyName));
const AGENDAS = {Standard: true, Random: true, Chairman: true, PartyLeaders: true} satisfies Record<AgendaStyle, boolean>;
const PLAYER_FIELDS: ReadonlySet<string> = new Set(['name', 'color', 'beginner', 'handicap', 'preludeHandicap', 'first', 'team', 'isBot']);
const ALLOWED_FIELDS: ReadonlySet<string> = new Set(['players', 'expansions', 'boards', ...Object.keys(FIELD_TYPES), ...CARD_FIELDS, ...COLONY_FIELDS]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function invalid(): never {
  throw new Error('Invalid public game settings.');
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Check the link before the native importer can touch its live form model. */
function validateSettings(value: unknown): JSONObject {
  if (!record(value) || Object.keys(value).some((key) => !ALLOWED_FIELDS.has(key))) {
    invalid();
  }
  const defaults = defaultCreateGameModel();
  const result = TemplateManager.serializeFormState(defaults);
  result.firstIndex = defaults.firstIndex;
  result.seed = defaults.seed;
  for (const [key, kind] of Object.entries(FIELD_TYPES)) {
    const field = value[key];
    if (field === undefined) {
      continue;
    }
    if (typeof field !== kind || (kind === 'number' && !finite(field))) {
      invalid();
    }
    result[key] = field as JSONValue;
  }
  const boards = value.boards;
  if (boards !== undefined) {
    if (!Array.isArray(boards) || boards.length === 0 ||
        !boards.every((board) => typeof board === 'string' && [...Object.values(BoardName), ...Object.values(RandomBoardOption)].includes(board as BoardName))) {
      invalid();
    }
    result.boards = boards as JSONValue;
    if (value.board === undefined) {
      result.board = boards[0] as JSONValue;
    }
  }
  if (result.botGame !== false || result.turnBasedGame !== false) {
    invalid();
  }
  if (![...Object.values(BoardName), ...Object.values(RandomBoardOption)].some((board) => board === result.board)) {
    invalid();
  }
  if (!Object.values(RandomMAOptionType).some((mode) => mode === result.randomMA)) {
    invalid();
  }
  if (typeof result.politicalAgendasExtension !== 'string' || !Object.hasOwn(AGENDAS, result.politicalAgendasExtension)) {
    invalid();
  }
  if (!finite(result.seed) || result.seed < 0 || result.seed >= 1) {
    invalid();
  }

  const expansions = value.expansions;
  if (!record(expansions) || Object.keys(expansions).some((key) => !EXPANSIONS.some((expansion) => expansion === key))) {
    invalid();
  }
  const enabled = {...DEFAULT_EXPANSIONS} as Record<string, boolean>;
  for (const [key, active] of Object.entries(expansions)) {
    if (typeof active !== 'boolean') {
      invalid();
    }
    enabled[key] = active;
  }
  result.expansions = enabled;
  for (const key of [...CARD_FIELDS, ...COLONY_FIELDS]) {
    const names = value[key];
    const colony = COLONY_FIELDS.some((field) => field === key);
    const allowed = colony ? COLONY_NAMES : CARD_NAMES;
    if (!Array.isArray(names) || names.some((name) => typeof name !== 'string' || (!allowed.has(name) && (colony || !CARD_RENAMES.has(name))))) {
      invalid();
    }
    result[key] = [...names];
  }
  const players = value.players;
  if (!Array.isArray(players) || players.length === 0 || players.length > defaults.players.length) {
    invalid();
  }
  const colors = new Set<string>();
  result.players = players.map((player): JSONObject => {
    if (!record(player) || Object.keys(player).some((key) => !PLAYER_FIELDS.has(key)) || player.name !== '' || player.isBot !== false ||
      typeof player.color !== 'string' || !PLAYER_COLORS.some((color) => color === player.color) || colors.has(player.color) ||
      typeof player.beginner !== 'boolean' || typeof player.first !== 'boolean' || !finite(player.handicap) ||
      (player.preludeHandicap !== undefined && !finite(player.preludeHandicap)) || (player.team !== undefined && !finite(player.team))) {
      invalid();
    }
    colors.add(player.color);
    return {name: '', color: player.color, beginner: player.beginner, first: player.first, handicap: player.handicap,
      preludeHandicap: player.preludeHandicap, team: player.team, isBot: false};
  });
  if (!finite(result.firstIndex) || !Number.isInteger(result.firstIndex) || result.firstIndex < 1 || result.firstIndex > players.length) {
    invalid();
  }
  if (typeof result.customBoardCode === 'string') {
    decodeCustomBoard(result.customBoardCode);
  }
  if (result.board === BoardName.CUSTOM && typeof result.customBoardCode !== 'string') {
    invalid();
  }
  for (const [field, type] of [['customMoonBoardCode', 'moon'], ['customVenusSurfaceBoardCode', 'venusPhase2']] as const) {
    if (typeof result[field] === 'string' && decodeSimpleBoard(result[field]).boardType !== type) {
      invalid();
    }
  }
  return result;
}

export function encodeSettingsHash(model: CreateGameModel): string {
  const settings = TemplateManager.serializeFormState(model);
  settings.firstIndex = model.firstIndex;
  settings.seed = model.seed;
  settings.players = model.players.slice(0, model.playersCount).map((player): JSONObject => ({
    name: '', color: player.color, beginner: player.beginner, handicap: player.handicap, preludeHandicap: player.preludeHandicap,
    first: player.first, team: player.team, isBot: false,
  }));
  const bytes = new TextEncoder().encode(JSON.stringify(validateSettings(settings)));
  if (bytes.length > MAX_BYTES) {
    throw new Error('These settings are too large for a link. Save them to a file instead.');
  }
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return PREFIX + VERSION + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSettingsHash(hash: string): JSONObject | undefined {
  if (!hash.startsWith(PREFIX)) {
    return undefined;
  }
  const encoded = hash.slice(PREFIX.length);
  if (!encoded.startsWith(VERSION)) {
    throw new Error('Unsupported settings link version.');
  }
  const payload = encoded.slice(VERSION.length);
  if (payload.length > Math.ceil(MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    invalid();
  }
  const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  if (binary.length > MAX_BYTES) {
    invalid();
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return validateSettings(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)));
}
