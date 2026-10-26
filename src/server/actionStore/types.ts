import {GameId, JSONValue} from '../../common/Types';

/**
 * The durable action journal is an append-only ledger of game intents.
 *
 * A stream belongs to one game. It is anchored by a genesis record (the save
 * point and state hash the stream starts from), fenced by an epoch, and ordered
 * by revision. Revisions are 1-based and contiguous: revision `n` links to
 * revision `n - 1` through `prevEventHash`.
 *
 * This module is a contract only. It intentionally does not know about HTTP
 * routes, PlayerInput, or the running game instance.
 */

/**
 * A JSON-serializable intent payload.
 *
 * Although {@link JSONValue} includes `undefined`, the store rejects it:
 * canonical hashing requires every value in the payload to be serializable.
 */
export type ActionPayload = JSONValue;

/**
 * Metadata about the prompt an intent answered.
 *
 * Replay uses `promptFingerprint` to prove the intent was produced against the
 * prompt the replay engine sees now, and `promptId` to correlate logs.
 */
export type PromptMetadata = {
  /** Stable caller-defined id of the prompt instance. */
  promptId: string;
  /** Prompt kind, for example `waitingFor.type` such as `SelectOption`. */
  promptType: string;
  /** Opaque stable hash/fingerprint of the prompt snapshot. */
  promptFingerprint: string;
  /** Optional position in the server prompt sequence. */
  promptIndex?: number;
};

/**
 * Per-game stream metadata.
 */
export type ActionStream = {
  gameId: GameId;
  /** Fencing generation. Every new intent must carry the current epoch. */
  epoch: number;
  /** Latest accepted revision; 0 means the stream contains only genesis. */
  revision: number;
  /** Hash of the intent at `revision`, or the genesis hash when `revision` is 0. */
  lastEventHash: string;
  /** Caller-defined identifier of the starting state. */
  genesisId: string;
  /**
   * Hash binding `gameId`, `genesisId`, `baseSaveId`, and `stateHash`.
   * Every entry in the stream is chained from this value.
   */
  genesisHash: string;
  /** Existing save point (`games.save_id`) the stream starts from. */
  baseSaveId: number;
  /** Caller-provided hash of the serialized starting state. */
  stateHash: string;
  createdAtMs: number;
  updatedAtMs: number;
};

/**
 * One accepted intent in the append-only ledger.
 */
export type ActionIntent = {
  gameId: GameId;
  /** 1-based stream position. Unique per game. */
  revision: number;
  /** Caller-provided idempotency key. Unique per game. */
  actionId: string;
  /** Epoch the write was accepted under. */
  epoch: number;
  actorId: string;
  intentType: string;
  payload: ActionPayload;
  /** SHA-256 of the canonical payload. */
  payloadHash: string;
  prompt: PromptMetadata | null;
  genesisId: string;
  /** Hash of the previous entry, or the stream genesis hash for revision 1. */
  prevEventHash: string;
  /** SHA-256 of the canonical event, chained through `prevEventHash`. */
  eventHash: string;
  recordedAtMs: number;
};

/**
 * Opens a stream at a genesis reference. Opening an already opened stream with
 * the same genesis is idempotent and returns `status: 'existing'`.
 */
export type OpenActionStreamRequest = {
  gameId: GameId;
  genesisId: string;
  /** Save point the stream starts from. */
  baseSaveId: number;
  /** Hash of the serialized starting state. Must be a lowercase SHA-256 hex. */
  stateHash: string;
};

export type OpenActionStreamResult = {
  status: 'opened' | 'existing';
  stream: ActionStream;
};

/**
 * Moves the stream to the next epoch. `expectedEpoch` is a CAS token: a writer
 * that did not observe the current epoch is fenced out.
 */
export type FenceActionStreamRequest = {
  gameId: GameId;
  expectedEpoch: number;
};

/**
 * Appends one intent.
 *
 * `expectedRevision` and `epoch` are CAS/fencing tokens. A byte-identical
 * retry of an already recorded `actionId` is reported as `duplicate` even if
 * its CAS token is stale, which is what makes retries safe.
 */
export type AppendActionIntentRequest = {
  gameId: GameId;
  /** Revision observed before the intent was produced. */
  expectedRevision: number;
  genesisId: string;
  epoch: number;
  actionId: string;
  actorId: string;
  intentType: string;
  payload: ActionPayload;
  prompt?: PromptMetadata;
};

export type AppendActionIntentResult = {
  status: 'appended' | 'duplicate';
  intent: ActionIntent;
  stream: ActionStream;
};

export type ListActionIntentsOptions = {
  /** First revision to return. Defaults to 1. */
  fromRevision?: number;
  /** Maximum number of intents to return. Defaults to 100, capped at 1000. */
  limit?: number;
};

/**
 * Request to persist the serialized state a stream replays from.
 *
 * The live game cannot act as the anchor: every database save bumps
 * `lastSaveId`, which is part of the canonical engine state, so the live
 * snapshot stops matching the stream genesis after the first background save.
 * Recovery therefore needs its own durable copy.
 */
export type PutGenesisSnapshotRequest = {
  gameId: GameId;
  genesisId: string;
  baseSaveId: number;
  /** Lowercase SHA-256 of the canonical engine state. Opaque to the store. */
  stateHash: string;
  /** Serialized engine state. Opaque to the store; replay interprets it. */
  snapshot: JSONValue;
};

/**
 * Persisted genesis record. Recovery replays revisions 1..head from this
 * snapshot and verifies the result against the journal hashes.
 */
export type GenesisSnapshotRecord = PutGenesisSnapshotRequest & {
  createdAtMs: number;
};
