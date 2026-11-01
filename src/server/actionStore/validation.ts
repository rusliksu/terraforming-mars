import {GameId, JSONValue} from '../../common/Types';
import {canonicalJson, canonicalPromptJson, computeGenesisHash, hashActionPayload, isSha256Hex} from './canonical';
import {
  InvalidActionGenesisError,
  InvalidActionIntentError,
  InvalidActionQueryError,
} from './errors';
import {
  ActionPayload,
  AppendActionIntentRequest,
  FenceActionStreamRequest,
  ListActionIntentsOptions,
  OpenActionStreamRequest,
  PromptMetadata,
  PutGenesisSnapshotRequest,
} from './types';

export const MAX_GAME_ID_LENGTH = 128;
export const MAX_ACTION_ID_LENGTH = 200;
export const MAX_ACTOR_ID_LENGTH = 100;
export const MAX_INTENT_TYPE_LENGTH = 100;
export const MAX_GENESIS_ID_LENGTH = 200;
export const MAX_PROMPT_ID_LENGTH = 200;
export const MAX_PROMPT_TYPE_LENGTH = 100;
export const MAX_PROMPT_FINGERPRINT_LENGTH = 256;
export const MAX_CANONICAL_PAYLOAD_BYTES = 1_000_000;
export const MAX_REVISION = 2_147_483_647;
export const DEFAULT_INTENT_PAGE_SIZE = 100;
export const MAX_INTENT_PAGE_SIZE = 1000;

type ErrorFactory = (message: string) => Error;

const intentError: ErrorFactory = (message) => new InvalidActionIntentError(message);
const genesisError: ErrorFactory = (message) => new InvalidActionGenesisError(message);

function readString(value: unknown, field: string, maxLength: number, makeError: ErrorFactory): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw makeError(`${field} must be a non-empty string of at most ${maxLength} characters`);
  }
  return value;
}

function readInteger(
  value: unknown,
  field: string,
  min: number,
  max: number,
  makeError: ErrorFactory,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw makeError(`${field} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function readGameId(value: unknown, makeError: ErrorFactory): GameId {
  return readString(value, 'gameId', MAX_GAME_ID_LENGTH, makeError) as GameId;
}

function readStateHash(value: unknown, field: string, makeError: ErrorFactory): string {
  if (!isSha256Hex(value)) {
    throw makeError(`${field} must be a lowercase SHA-256 hex string`);
  }
  return value;
}

export type ValidatedOpenActionStreamRequest = {
  gameId: GameId;
  genesisId: string;
  baseSaveId: number;
  stateHash: string;
  genesisHash: string;
};

export function validateOpenActionStreamRequest(
  request: OpenActionStreamRequest,
): ValidatedOpenActionStreamRequest {
  const gameId = readGameId(request.gameId, genesisError);
  const genesisId = readString(request.genesisId, 'genesisId', MAX_GENESIS_ID_LENGTH, genesisError);
  const baseSaveId = readInteger(request.baseSaveId, 'baseSaveId', 0, MAX_REVISION, genesisError);
  const stateHash = readStateHash(request.stateHash, 'stateHash', genesisError);
  return {
    gameId,
    genesisId,
    baseSaveId,
    stateHash,
    genesisHash: computeGenesisHash({gameId, genesisId, baseSaveId, stateHash}),
  };
}

export type ValidatedFenceActionStreamRequest = {
  gameId: GameId;
  expectedEpoch: number;
};

export function validateFenceActionStreamRequest(
  request: FenceActionStreamRequest,
): ValidatedFenceActionStreamRequest {
  return {
    gameId: readGameId(request.gameId, intentError),
    expectedEpoch: readInteger(request.expectedEpoch, 'expectedEpoch', 1, MAX_REVISION, intentError),
  };
}

export type ValidatedAppendActionIntentRequest = {
  gameId: GameId;
  expectedRevision: number;
  genesisId: string;
  epoch: number;
  actionId: string;
  actorId: string;
  intentType: string;
  payload: ActionPayload;
  payloadHash: string;
  payloadJson: string;
  prompt: PromptMetadata | null;
  promptJson: string | null;
};

export function validateAppendActionIntentRequest(
  request: AppendActionIntentRequest,
): ValidatedAppendActionIntentRequest {
  const gameId = readGameId(request.gameId, intentError);
  const expectedRevision = readInteger(request.expectedRevision, 'expectedRevision', 0, MAX_REVISION, intentError);
  const genesisId = readString(request.genesisId, 'genesisId', MAX_GENESIS_ID_LENGTH, intentError);
  const epoch = readInteger(request.epoch, 'epoch', 1, MAX_REVISION, intentError);
  const actionId = readString(request.actionId, 'actionId', MAX_ACTION_ID_LENGTH, intentError);
  const actorId = readString(request.actorId, 'actorId', MAX_ACTOR_ID_LENGTH, intentError);
  const intentType = readString(request.intentType, 'intentType', MAX_INTENT_TYPE_LENGTH, intentError);
  const payload = request.payload;
  const payloadJson = canonicalJson(payload);
  const payloadBytes = Buffer.byteLength(payloadJson, 'utf8');
  if (payloadBytes > MAX_CANONICAL_PAYLOAD_BYTES) {
    throw new InvalidActionIntentError(
      `payload canonical form is ${payloadBytes} bytes, limit is ${MAX_CANONICAL_PAYLOAD_BYTES}`,
    );
  }
  const prompt = validatePromptMetadata(request.prompt);
  return {
    gameId,
    expectedRevision,
    genesisId,
    epoch,
    actionId,
    actorId,
    intentType,
    payload,
    payloadHash: hashActionPayload(payload),
    payloadJson,
    prompt,
    promptJson: canonicalPromptJson(prompt),
  };
}

export function validatePromptMetadata(prompt: PromptMetadata | undefined | null): PromptMetadata | null {
  if (prompt === undefined || prompt === null) {
    return null;
  }
  const promptId = readString(prompt.promptId, 'prompt.promptId', MAX_PROMPT_ID_LENGTH, intentError);
  const promptType = readString(prompt.promptType, 'prompt.promptType', MAX_PROMPT_TYPE_LENGTH, intentError);
  const promptFingerprint = readString(
    prompt.promptFingerprint,
    'prompt.promptFingerprint',
    MAX_PROMPT_FINGERPRINT_LENGTH,
    intentError,
  );
  const result: PromptMetadata = {promptId, promptType, promptFingerprint};
  if (prompt.promptIndex !== undefined) {
    result.promptIndex = readInteger(prompt.promptIndex, 'prompt.promptIndex', 0, MAX_REVISION, intentError);
  }
  return result;
}

/** Serialized games grow with the tableau; 8 MiB is far above any observed state. */
export const MAX_GENESIS_SNAPSHOT_BYTES = 8 * 1024 * 1024;

export type ValidatedPutGenesisSnapshotRequest = {
  gameId: GameId;
  genesisId: string;
  baseSaveId: number;
  stateHash: string;
  snapshot: JSONValue;
  /** Canonical JSON of the snapshot; used for idempotent comparison. */
  snapshotJson: string;
};

export function validatePutGenesisSnapshotRequest(
  request: PutGenesisSnapshotRequest,
): ValidatedPutGenesisSnapshotRequest {
  const gameId = readGameId(request.gameId, genesisError);
  const genesisId = readString(request.genesisId, 'genesisId', MAX_GENESIS_ID_LENGTH, genesisError);
  const baseSaveId = readInteger(request.baseSaveId, 'baseSaveId', 0, MAX_REVISION, genesisError);
  const stateHash = readStateHash(request.stateHash, 'stateHash', genesisError);
  if (typeof request.snapshot !== 'object' || request.snapshot === null || Array.isArray(request.snapshot)) {
    throw genesisError('snapshot must be a serialized engine state object');
  }
  let snapshotJson: string;
  try {
    snapshotJson = canonicalJson(request.snapshot);
  } catch (_err) {
    throw genesisError('snapshot must be canonical JSON');
  }
  if (Buffer.byteLength(snapshotJson, 'utf8') > MAX_GENESIS_SNAPSHOT_BYTES) {
    throw genesisError('snapshot must be at most ' + MAX_GENESIS_SNAPSHOT_BYTES + ' bytes');
  }
  return {gameId, genesisId, baseSaveId, stateHash, snapshot: request.snapshot, snapshotJson};
}

export type ValidatedListActionIntentsOptions = {
  fromRevision: number;
  limit: number;
};

export function validateListActionIntentsOptions(
  options: ListActionIntentsOptions | undefined,
): ValidatedListActionIntentsOptions {
  const fromRevision = options?.fromRevision === undefined ?
    1 :
    readInteger(options.fromRevision, 'fromRevision', 1, MAX_REVISION, (message) => new InvalidActionQueryError(message));
  const limit = options?.limit === undefined ?
    DEFAULT_INTENT_PAGE_SIZE :
    readInteger(options.limit, 'limit', 1, MAX_INTENT_PAGE_SIZE, (message) => new InvalidActionQueryError(message));
  return {fromRevision, limit};
}
