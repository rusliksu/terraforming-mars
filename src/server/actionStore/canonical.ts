import crypto from 'crypto';
import {GameId} from '../../common/Types';
import {InvalidActionIntentError} from './errors';
import {PromptMetadata} from './types';

/**
 * Canonical serialization and hashing for the action journal.
 *
 * Everything persisted by every adapter goes through these functions so that
 * SQLite, in-memory, and PostgreSQL produce identical hashes: object keys are
 * sorted, arrays keep their order, and unsupported values are rejected.
 */

export const ACTION_PAYLOAD_HASH_DOMAIN = 'tm.action-journal.payload.v1';
export const ACTION_GENESIS_HASH_DOMAIN = 'tm.action-journal.genesis.v1';
export const ACTION_EVENT_HASH_DOMAIN = 'tm.action-journal.event.v1';

const SHA256_HEX = /^[0-9a-f]{64}$/;

export function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && SHA256_HEX.test(value);
}

/**
 * Serializes a JSON-like value deterministically, rejecting values that cannot
 * round-trip through JSON (`undefined`, functions, `Date`, non-finite numbers,
 * and so on).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value, '$'));
}

function canonicalize(value: unknown, path: string): unknown {
  if (value === null) {
    return null;
  }
  switch (typeof value) {
  case 'string':
  case 'boolean':
    return value;
  case 'number':
    if (!Number.isFinite(value)) {
      throw new InvalidActionIntentError(`Non-finite number at ${path}`);
    }
    return value;
  case 'object': {
    if (Array.isArray(value)) {
      return value.map((item, index) => canonicalize(item, `${path}[${index}]`));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new InvalidActionIntentError(`Unsupported object at ${path}; expected a plain JSON object`);
    }
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      result[key] = canonicalize(source[key], `${path}.${key}`);
    }
    return result;
  }
  default:
    throw new InvalidActionIntentError(`Unsupported ${typeof value} value at ${path}`);
  }
}

export function hashActionPayload(payload: unknown): string {
  return sha256Hex(canonicalJson({
    domain: ACTION_PAYLOAD_HASH_DOMAIN,
    payload,
  }));
}

export type GenesisHashInput = {
  gameId: GameId;
  genesisId: string;
  baseSaveId: number;
  stateHash: string;
};

export function computeGenesisHash(input: GenesisHashInput): string {
  return sha256Hex(canonicalJson({
    domain: ACTION_GENESIS_HASH_DOMAIN,
    gameId: input.gameId,
    genesisId: input.genesisId,
    baseSaveId: input.baseSaveId,
    stateHash: input.stateHash,
  }));
}

export type ActionEventHashInput = {
  gameId: GameId;
  revision: number;
  epoch: number;
  actionId: string;
  actorId: string;
  intentType: string;
  payloadHash: string;
  prompt: PromptMetadata | null;
  genesisId: string;
  prevEventHash: string;
  recordedAtMs: number;
};

export function computeActionEventHash(input: ActionEventHashInput): string {
  return sha256Hex(canonicalJson({
    domain: ACTION_EVENT_HASH_DOMAIN,
    gameId: input.gameId,
    revision: input.revision,
    epoch: input.epoch,
    actionId: input.actionId,
    actorId: input.actorId,
    intentType: input.intentType,
    payloadHash: input.payloadHash,
    prompt: input.prompt,
    genesisId: input.genesisId,
    prevEventHash: input.prevEventHash,
    recordedAtMs: input.recordedAtMs,
  }));
}

export function canonicalPromptJson(prompt: PromptMetadata | null): string | null {
  return prompt === null ? null : canonicalJson(prompt);
}
