import type {ActionParseResult, ActionRequestV1} from './ActionProtocol';
import {ACTION_SCHEMA_VERSION, MAX_ACTION_REQUEST_BYTES} from './ActionProtocol';
import {parseInputResponse} from './parseInputResponse';

const ACTION_KEYS = new Set([
  'v', 'gameId', 'actionId', 'baseRevision', 'promptToken', 'engineVersion', 'input',
]);
const GAME_ID = /^g[A-Za-z0-9_-]{1,63}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROMPT_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;
const ENGINE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/;

class ActionValidationError extends Error {
  constructor(public readonly path: string, public readonly reason: string) {
    super(path + ': ' + reason);
    this.name = 'ActionValidationError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function failure(path: string, reason: string): never {
  throw new ActionValidationError(path, reason);
}

function string(value: unknown, path: string, min: number, max: number, pattern?: RegExp): string {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    failure(path, 'expected a string of length ' + min + '..' + max);
  }
  if (pattern && !pattern.test(value)) {
    failure(path, 'string format is invalid');
  }
  return value;
}

function integer(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    failure(path, 'expected an integer in range');
  }
  return value;
}

function parseValue(value: unknown): ActionRequestV1 {
  if (!isPlainObject(value)) {
    failure('$', 'expected an object');
  }
  const keys = Object.keys(value);
  for (const key of keys) {
    if (!ACTION_KEYS.has(key)) {
      failure('$.' + key, 'unexpected field');
    }
  }
  for (const key of ACTION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      failure('$.' + key, 'missing field');
    }
  }
  if (value.v !== ACTION_SCHEMA_VERSION) {
    failure('$.v', 'unsupported schema version');
  }
  string(value.gameId, '$.gameId', 2, 64, GAME_ID);
  string(value.actionId, '$.actionId', 36, 36, UUID);
  integer(value.baseRevision, '$.baseRevision', 0, Number.MAX_SAFE_INTEGER);
  string(value.promptToken, '$.promptToken', 16, 128, PROMPT_TOKEN);
  string(value.engineVersion, '$.engineVersion', 1, 128, ENGINE_VERSION);
  const input = parseInputResponse(value.input);
  if (!input.ok) {
    failure('$.input' + input.error.path.replace(/^input/, ''), input.error.reason);
  }
  return value as unknown as ActionRequestV1;
}

export function parseActionRequest(value: unknown): ActionParseResult<ActionRequestV1> {
  try {
    return {ok: true, value: parseValue(value)};
  } catch (err) {
    if (err instanceof ActionValidationError) {
      return {ok: false, error: {code: 'INVALID_SCHEMA', path: err.path, reason: err.reason}};
    }
    throw err;
  }
}

export function parseActionRequestJson(raw: string): ActionParseResult<ActionRequestV1> {
  if (typeof raw !== 'string') {
    return {ok: false, error: {code: 'INVALID_JSON', path: '$', reason: 'body must be a string'}};
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_ACTION_REQUEST_BYTES) {
    return {ok: false, error: {code: 'INVALID_JSON', path: '$', reason: 'body is too large'}};
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {ok: false, error: {code: 'INVALID_JSON', path: '$', reason: 'invalid JSON'}};
  }
  return parseActionRequest(value);
}
