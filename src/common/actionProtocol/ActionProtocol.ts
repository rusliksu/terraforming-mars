import type {GameId} from '../Types';
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
  | 'PERSISTENCE_FAILURE';

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

export interface ActionParseError {
  code: 'INVALID_JSON' | 'INVALID_SCHEMA';
  path: string;
  reason: string;
}

export type ActionParseResult<T> =
  | {ok: true; value: T}
  | {ok: false; error: ActionParseError};
