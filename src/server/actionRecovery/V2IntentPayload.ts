import {InputResponse} from '../../common/inputs/InputResponse';
import {ActionIntent, isSha256Hex} from '../actionStore';
import {ActionRecoveryError} from './ActionRecoveryError';

/** Intent types owned by the v2 journal. */
export const ACTION_INTENT_TYPE = 'player.input.v2';
export const UNDO_INTENT_TYPE = 'player.undo.v2';

/**
 * A answered prompt. `stateHashAfter` is the canonical engine state hash the
 * commit produced; replay refuses to continue when it does not reproduce it.
 */
export type V2ActionPayload = {
  kind: 'action';
  requestFingerprint: string;
  baseRevision: number;
  engineVersion: string;
  promptTokenHash: string;
  input: InputResponse;
  stateHashAfter: string;
};

/**
 * An append-only undo. It keeps every earlier journal entry and only removes
 * its *effect*: replay truncates to `targetRevision` and re-verifies that the
 * resulting state hash equals `stateHashAfter`.
 */
export type V2UndoPayload = {
  kind: 'undo';
  requestFingerprint: string;
  baseRevision: number;
  engineVersion: string;
  targetRevision: number;
  undoneActionId: string;
  stateHashBefore: string;
  stateHashAfter: string;
};

export type V2IntentPayload = V2ActionPayload | V2UndoPayload;

function corrupt(message: string): never {
  throw new ActionRecoveryError('INTENT_CORRUPT', message);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    corrupt(field + ' must be an object');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    corrupt(field + ' must be a non-empty string');
  }
  return value;
}

function integer(value: unknown, field: string, min: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) {
    corrupt(field + ' must be an integer >= ' + min);
  }
  return value;
}

function hash(value: unknown, field: string): string {
  if (!isSha256Hex(value)) {
    corrupt(field + ' must be a lowercase SHA-256 hex string');
  }
  return value;
}

function inputResponse(value: unknown): InputResponse {
  const parsed = record(value, 'input');
  if (typeof parsed.type !== 'string' || parsed.type.length === 0) {
    corrupt('input.type must be a non-empty string');
  }
  return value as InputResponse;
}

/**
 * Parses the payload of one journal entry and proves it belongs to the entry.
 *
 * Unknown or legacy payload shapes fail closed: a journal entry that cannot be
 * replayed exactly must never be treated as a no-op.
 */
export function parseV2IntentPayload(intent: ActionIntent): V2IntentPayload {
  const payload = record(intent.payload, 'payload');
  if (intent.intentType === ACTION_INTENT_TYPE) {
    const parsed: V2ActionPayload = {
      kind: 'action',
      requestFingerprint: hash(payload.requestFingerprint, 'requestFingerprint'),
      baseRevision: integer(payload.baseRevision, 'baseRevision', 0),
      engineVersion: text(payload.engineVersion, 'engineVersion'),
      promptTokenHash: hash(payload.promptTokenHash, 'promptTokenHash'),
      input: inputResponse(payload.input),
      stateHashAfter: hash(payload.stateHashAfter, 'stateHashAfter'),
    };
    if (payload.kind !== undefined && payload.kind !== 'action') {
      corrupt('payload kind does not match the intent type');
    }
    if (parsed.baseRevision !== intent.revision - 1) {
      corrupt('baseRevision does not match the journal position');
    }
    return parsed;
  }
  if (intent.intentType === UNDO_INTENT_TYPE) {
    if (payload.kind !== 'undo') {
      corrupt('undo intent payload must declare kind "undo"');
    }
    const parsed: V2UndoPayload = {
      kind: 'undo',
      requestFingerprint: hash(payload.requestFingerprint, 'requestFingerprint'),
      baseRevision: integer(payload.baseRevision, 'baseRevision', 0),
      engineVersion: text(payload.engineVersion, 'engineVersion'),
      targetRevision: integer(payload.targetRevision, 'targetRevision', 0),
      undoneActionId: text(payload.undoneActionId, 'undoneActionId'),
      stateHashBefore: hash(payload.stateHashBefore, 'stateHashBefore'),
      stateHashAfter: hash(payload.stateHashAfter, 'stateHashAfter'),
    };
    if (parsed.baseRevision !== intent.revision - 1) {
      corrupt('baseRevision does not match the journal position');
    }
    return parsed;
  }
  return corrupt('unknown v2 intent type ' + intent.intentType);
}
