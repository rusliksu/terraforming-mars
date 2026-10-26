import type {GameId, PlayerId} from '../Types';
import type {InputResponse} from '../inputs/InputResponse';
import type {PlayerViewModel} from '../models/PlayerModel';

/** Wire schema version. The HTTP endpoint stays /player/input/v2. */
export const ACTION_SCHEMA_VERSION = 1;
export const ACTION_ENDPOINT_PATH = '/player/input/v2';
export const MAX_ACTION_REQUEST_BYTES = 32 * 1024;

/**
 * Client intent. The server derives playerId from the authenticated session;
 * it is deliberately absent from this payload.
 */
export interface ActionRequestV1 {
  v: typeof ACTION_SCHEMA_VERSION;
  gameId: GameId;
  actionId: string;
  baseRevision: number;
  promptToken: string;
  engineVersion: string;
  input: InputResponse;
}

export type ActionErrorCode =
  | 'INVALID_SCHEMA'
  | 'UNAUTHORIZED'
  | 'ENGINE_VERSION_MISMATCH'
  | 'STALE_PROMPT'
  | 'STALE_REVISION'
  | 'INVALID_ACTION'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMITED'
  | 'PERSISTENCE_FAILURE'
  | 'RECOVERY_FAILED'
  | 'UNDO_REJECTED'
  | 'UNDO_HIDDEN_INFORMATION';

export interface ActionErrorResponseV1 {
  v: typeof ACTION_SCHEMA_VERSION;
  status: 'rejected';
  code: ActionErrorCode;
  actionId?: string;
  currentRevision?: number;
  currentPromptToken?: string;
  resync?: 'full';
  retryable?: boolean;
}

export interface ActionSuccessResponseV1 {
  v: typeof ACTION_SCHEMA_VERSION;
  actionId: string;
  status: 'applied' | 'duplicate';
  revision: number;
  appliedRevision: number;
  engineVersion: string;
  viewRevision: number;
  view: PlayerViewModel;
  viewHash: string;
  promptToken?: string;
}

export type ActionResponseV1 = ActionSuccessResponseV1 | ActionErrorResponseV1;

/**
 * Append-only undo intent.
 *
 * The client never names the revision to revert: the server derives the actor's
 * own last effective action. `baseRevision` is the CAS token that proves which
 * journal head the client observed.
 */
export interface UndoRequestV1 {
  v: typeof ACTION_SCHEMA_VERSION;
  gameId: GameId;
  actionId: string;
  baseRevision: number;
  engineVersion: string;
}

export interface ActionUndoSuccessResponseV1 {
  v: typeof ACTION_SCHEMA_VERSION;
  actionId: string;
  status: 'undone';
  /** Journal head after the undo intent was appended. */
  revision: number;
  /** Revision of the undo intent itself. */
  appliedRevision: number;
  /** Effective revision the state was reverted to. */
  undoneRevision: number;
  engineVersion: string;
  viewRevision: number;
  view: PlayerViewModel;
  viewHash: string;
  promptToken?: string;
}

export type UndoResponseV1 = ActionUndoSuccessResponseV1 | ActionErrorResponseV1;

/**
 * Server-issued prompt bootstrap used for a full authorized resync.
 *
 * The client must never synthesize these values: `revision` is the journal
 * head, `promptToken` is an HMAC issued for the actor's current prompt at
 * `revision + 1`, and `view` is the actor-scoped PlayerViewModel recovered
 * from genesis plus replay.
 */
export interface ActionBootstrapResponseV1 {
  v: typeof ACTION_SCHEMA_VERSION;
  status: 'ready';
  gameId: GameId;
  playerId: PlayerId;
  /** Effective journal head. */
  revision: number;
  /** Alias of `revision`; the shell binds submit intents to this name. */
  baseRevision: number;
  /** Opaque server-issued token; absent when the actor has no waiting prompt. */
  promptToken?: string;
  promptType?: string;
  promptFingerprint?: string;
  engineVersion: string;
  view: PlayerViewModel;
  viewRevision: number;
  viewHash: string;
}

export type BootstrapResponseV1 = ActionBootstrapResponseV1 | ActionErrorResponseV1;

export interface ActionParseError {
  code: 'INVALID_JSON' | 'INVALID_SCHEMA';
  path: string;
  reason: string;
}

export type ActionParseResult<T> =
  | {ok: true; value: T}
  | {ok: false; error: ActionParseError};
