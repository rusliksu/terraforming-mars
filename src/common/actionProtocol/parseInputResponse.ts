import {CardName} from '../cards/CardName';
import {ColonyName} from '../colonies/ColonyName';
import {PLAYER_COLORS} from '../Color';
import type {InputResponse} from '../inputs/InputResponse';
import {SPENDABLE_RESOURCES} from '../inputs/Spendable';
import {GlobalEventName} from '../turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../turmoil/PartyName';
import {POLICY_IDS} from '../turmoil/Types';
import {Units} from '../Units';
import type {ActionParseResult} from './ActionProtocol';

const CARD_NAMES = new Set<string>(Object.values(CardName));
const COLONY_NAMES = new Set<string>(Object.values(ColonyName));
const GLOBAL_EVENT_NAMES = new Set<string>(Object.values(GlobalEventName));
const PARTY_NAMES = new Set<string>(Object.values(PartyName));
const POLICY_IDS_SET = new Set<string>(POLICY_IDS);
const UNIT_KEYS = new Set<string>(Units.keys);
const SPENDABLE_KEYS = new Set<string>(SPENDABLE_RESOURCES);
const COLORS = new Set<string>([...PLAYER_COLORS, 'neutral', 'bronze', 'NEUTRAL']);

const MAX_DEPTH = 8;
const MAX_NODES = 1024;
const MAX_ARRAY = 64;
const MAX_AMOUNT = 1_000_000;
const MAX_SELECTED = 10_000;

export class InputResponseValidationError extends Error {
  constructor(public readonly path: string, public readonly reason: string) {
    super(path + ': ' + reason);
    this.name = 'InputResponseValidationError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

class InputResponseParser {
  private nodes = 0;

  public parse(value: unknown): InputResponse {
    return this.parseValue(value, 'input', 0);
  }

  private parseValue(value: unknown, path: string, depth: number): InputResponse {
    if (depth > MAX_DEPTH) {
      this.fail(path, 'nesting is too deep');
    }
    this.nodes++;
    if (this.nodes > MAX_NODES) {
      this.fail(path, 'too many values');
    }
    const obj = this.plainObject(value, path);
    const type = this.string(obj.type, path + '.type', 1, 32);
    switch (type) {
    case 'option':
      this.exactObject(value, path, ['type']);
      break;
    case 'or': {
      this.exactObject(value, path, ['type', 'index', 'response']);
      this.integer(obj.index, path + '.index', 0, MAX_ARRAY - 1);
      this.parseValue(obj.response, path + '.response', depth + 1);
      break;
    }
    case 'and':
    case 'initialCards': {
      this.exactObject(value, path, ['type', 'responses']);
      this.parseArray(obj.responses, path + '.responses', depth);
      break;
    }
    case 'card': {
      this.exactObject(value, path, ['type', 'cards']);
      this.cardArray(obj.cards, path + '.cards');
      break;
    }
    case 'projectCard': {
      this.exactObject(value, path, ['type', 'card', 'payment']);
      this.cardName(obj.card, path + '.card');
      this.payment(obj.payment, path + '.payment');
      break;
    }
    case 'space': {
      this.exactObject(value, path, ['type', 'spaceId']);
      this.string(obj.spaceId, path + '.spaceId', 2, 3, /^m?[0-9]{2}$/);
      break;
    }
    case 'player':
    case 'delegate': {
      this.exactObject(value, path, ['type', 'player']);
      this.oneOf(obj.player, path + '.player', COLORS);
      break;
    }
    case 'party': {
      this.exactObject(value, path, ['type', 'partyName']);
      this.oneOf(obj.partyName, path + '.partyName', PARTY_NAMES);
      break;
    }
    case 'amount':
    case 'deltaProject': {
      this.exactObject(value, path, ['type', 'amount']);
      this.integer(obj.amount, path + '.amount', 0, MAX_AMOUNT);
      break;
    }
    case 'colony': {
      this.exactObject(value, path, ['type', 'colonyName']);
      this.oneOf(obj.colonyName, path + '.colonyName', COLONY_NAMES);
      break;
    }
    case 'payment': {
      this.exactObject(value, path, ['type', 'payment']);
      this.payment(obj.payment, path + '.payment');
      break;
    }
    case 'productionToLose': {
      this.exactObject(value, path, ['type', 'units']);
      this.units(obj.units, path + '.units', false);
      break;
    }
    case 'aresGlobalParameters': {
      this.exactObject(value, path, ['type', 'response']);
      const ares = this.exactObject(obj.response, path + '.response',
        ['lowOceanDelta', 'highOceanDelta', 'temperatureDelta', 'oxygenDelta']);
      for (const key of ['lowOceanDelta', 'highOceanDelta', 'temperatureDelta', 'oxygenDelta']) {
        this.integer(ares[key], path + '.response.' + key, -1, 1);
      }
      break;
    }
    case 'globalEvent': {
      this.exactObject(value, path, ['type', 'globalEventName']);
      this.oneOf(obj.globalEventName, path + '.globalEventName', GLOBAL_EVENT_NAMES);
      break;
    }
    case 'policy': {
      this.exactObject(value, path, ['type', 'policyId']);
      this.oneOf(obj.policyId, path + '.policyId', POLICY_IDS_SET);
      break;
    }
    case 'resource': {
      this.exactObject(value, path, ['type', 'resource']);
      this.oneOf(obj.resource, path + '.resource', UNIT_KEYS);
      break;
    }
    case 'resources': {
      this.exactObject(value, path, ['type', 'units']);
      this.units(obj.units, path + '.units', false);
      break;
    }
    case 'claimedUndergroundToken': {
      this.exactObject(value, path, ['type', 'selected']);
      this.selectedArray(obj.selected, path + '.selected');
      break;
    }
    default:
      this.fail(path + '.type', 'unknown input type');
    }
    return value as InputResponse;
  }

  private parseArray(value: unknown, path: string, depth: number): void {
    if (!Array.isArray(value)) {
      this.fail(path, 'expected an array');
    }
    if (value.length > MAX_ARRAY) {
      this.fail(path, 'array is too long');
    }
    for (let i = 0; i < value.length; i++) {
      this.parseValue(value[i], path + '[' + i + ']', depth + 1);
    }
  }

  private cardArray(value: unknown, path: string): void {
    if (!Array.isArray(value)) {
      this.fail(path, 'expected an array');
    }
    if (value.length > MAX_ARRAY) {
      this.fail(path, 'array is too long');
    }
    const seen = new Set<string>();
    for (let i = 0; i < value.length; i++) {
      const card = this.cardName(value[i], path + '[' + i + ']');
      if (seen.has(card)) {
        this.fail(path + '[' + i + ']', 'duplicate card');
      }
      seen.add(card);
    }
  }

  private selectedArray(value: unknown, path: string): void {
    if (!Array.isArray(value)) {
      this.fail(path, 'expected an array');
    }
    if (value.length > MAX_ARRAY) {
      this.fail(path, 'array is too long');
    }
    const seen = new Set<number>();
    for (let i = 0; i < value.length; i++) {
      const selected = this.integer(value[i], path + '[' + i + ']', 0, MAX_SELECTED);
      if (seen.has(selected)) {
        this.fail(path + '[' + i + ']', 'duplicate selection');
      }
      seen.add(selected);
    }
  }

  private payment(value: unknown, path: string): void {
    const obj = this.exactKeys(value, path, SPENDABLE_KEYS);
    for (const key of SPENDABLE_RESOURCES) {
      this.integer(obj[key], path + '.' + key, 0, MAX_AMOUNT);
    }
  }

  private units(value: unknown, path: string, allowNegative: boolean): void {
    const obj = this.exactKeys(value, path, UNIT_KEYS);
    for (const key of Units.keys) {
      this.integer(obj[key], path + '.' + key, allowNegative ? -MAX_AMOUNT : 0, MAX_AMOUNT);
    }
  }

  private cardName(value: unknown, path: string): string {
    return this.oneOf(value, path, CARD_NAMES);
  }

  private plainObject(value: unknown, path: string): Record<string, unknown> {
    if (!isPlainObject(value)) {
      this.fail(path, 'expected an object');
    }
    return value;
  }

  private exactObject(value: unknown, path: string, keys: ReadonlyArray<string>): Record<string, unknown> {
    return this.exactKeys(value, path, new Set(keys));
  }

  private exactKeys(value: unknown, path: string, keys: ReadonlySet<string>): Record<string, unknown> {
    if (!isPlainObject(value)) {
      this.fail(path, 'expected an object');
    }
    const actual = Object.keys(value);
    for (const key of actual) {
      if (!keys.has(key)) {
        this.fail(path + '.' + key, 'unexpected field');
      }
    }
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        this.fail(path + '.' + key, 'missing field');
      }
    }
    return value;
  }

  private oneOf(value: unknown, path: string, allowed: ReadonlySet<string>): string {
    const str = this.string(value, path, 1, 128);
    if (!allowed.has(str)) {
      this.fail(path, 'unknown value');
    }
    return str;
  }

  private string(value: unknown, path: string, min: number, max: number, pattern?: RegExp): string {
    if (typeof value !== 'string' || value.length < min || value.length > max) {
      this.fail(path, 'expected a string of length ' + min + '..' + max);
    }
    if (pattern && !pattern.test(value)) {
      this.fail(path, 'string format is invalid');
    }
    return value;
  }

  private integer(value: unknown, path: string, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
      this.fail(path, 'expected an integer in range');
    }
    return value;
  }

  private fail(path: string, reason: string): never {
    throw new InputResponseValidationError(path, reason);
  }
}

/** Structural validation only. Prompt legality, counts and affordability stay server-side. */
export function parseInputResponse(value: unknown): ActionParseResult<InputResponse> {
  try {
    return {ok: true, value: new InputResponseParser().parse(value)};
  } catch (err) {
    if (err instanceof InputResponseValidationError) {
      return {ok: false, error: {code: 'INVALID_SCHEMA', path: err.path, reason: err.reason}};
    }
    throw err;
  }
}
