import {JSONValue} from '../../common/Types';
import {computeActionEventHash, canonicalJson, canonicalPromptJson} from './canonical';
import {ActionIntent, ActionPayload, ActionStream, GenesisSnapshotRecord} from './types';
import {ValidatedAppendActionIntentRequest} from './validation';

/**
 * Adapts a synchronous (single-connection) store operation to the Promise
 * contract without hiding synchronous throws.
 */
export function promiseFromSync<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation());
  } catch (err) {
    return Promise.reject(err);
  }
}

export function cloneActionIntent(intent: ActionIntent): ActionIntent {
  return {
    ...intent,
    payload: JSON.parse(canonicalJson(intent.payload)) as ActionPayload,
    prompt: intent.prompt === null ? null : {...intent.prompt},
  };
}

export function cloneActionStream(stream: ActionStream): ActionStream {
  return {...stream};
}

/** Deep-clones a genesis record so callers cannot mutate stored state. */
export function cloneGenesisSnapshot(record: GenesisSnapshotRecord): GenesisSnapshotRecord {
  return {
    ...record,
    snapshot: JSON.parse(canonicalJson(record.snapshot)) as JSONValue,
  };
}

/**
 * Whether an already recorded intent carries exactly the same intent content as
 * the incoming request. Used for idempotent retries; revision, epoch, and
 * timestamps are deliberately not part of the comparison.
 */
export function isSameIntentContent(
  existing: ActionIntent,
  incoming: ValidatedAppendActionIntentRequest,
): boolean {
  return existing.payloadHash === incoming.payloadHash &&
    existing.actorId === incoming.actorId &&
    existing.intentType === incoming.intentType &&
    canonicalPromptJson(existing.prompt) === incoming.promptJson;
}

export type NewActionIntent = {
  revision: number;
  prevEventHash: string;
  recordedAtMs: number;
  request: ValidatedAppendActionIntentRequest;
};

/**
 * Builds the persisted intent, including its canonical event hash.
 */
export function buildActionIntent(input: NewActionIntent): ActionIntent {
  const request = input.request;
  const eventHash = computeActionEventHash({
    gameId: request.gameId,
    revision: input.revision,
    epoch: request.epoch,
    actionId: request.actionId,
    actorId: request.actorId,
    intentType: request.intentType,
    payloadHash: request.payloadHash,
    prompt: request.prompt,
    genesisId: request.genesisId,
    prevEventHash: input.prevEventHash,
    recordedAtMs: input.recordedAtMs,
  });
  return {
    gameId: request.gameId,
    revision: input.revision,
    actionId: request.actionId,
    epoch: request.epoch,
    actorId: request.actorId,
    intentType: request.intentType,
    payload: request.payload,
    payloadHash: request.payloadHash,
    prompt: request.prompt,
    genesisId: request.genesisId,
    prevEventHash: input.prevEventHash,
    eventHash,
    recordedAtMs: input.recordedAtMs,
  };
}
