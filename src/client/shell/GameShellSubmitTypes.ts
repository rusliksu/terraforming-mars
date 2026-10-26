import type {
  ActionErrorCode,
  ActionRequestV1,
  ActionResponseV1,
} from '@/common/actionProtocol/ActionProtocol';
import type {InputResponse} from '@/common/inputs/InputResponse';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {PlayerId} from '@/common/Types';

/**
 * A semantic v2 action intent.
 *
 * The game id lives on GameShellSubmitService because one service instance is
 * bound to one game. Everything else is caller-supplied, including the
 * server-issued opaque prompt token: this client never fabricates one.
 */
export interface GameShellSubmitIntent {
  /** Client idempotency key. Retries of the same intent must reuse it. */
  actionId: string;
  /** Last server revision confirmed by the client. */
  baseRevision: number;
  /** Server-issued opaque token for the current prompt. */
  promptToken: string;
  /** Server build/rules identity. */
  engineVersion: string;
  input: InputResponse;
}

/** Parsed response of POST /player/input/v2. */
export interface GameShellTransportResponse {
  statusCode: number;
  /** Parsed JSON body, undefined when the response body is not valid JSON. */
  body?: ActionResponseV1;
}

/**
 * Network boundary of the submit service. post() rejects only for a transport
 * failure (no HTTP response); HTTP error statuses are returned as data.
 */
export interface GameShellTransport {
  post(request: ActionRequestV1): Promise<GameShellTransportResponse>;
  /** Full authorized GET player resync used after a stale/version conflict. */
  fetchPlayerView(playerId?: PlayerId): Promise<PlayerViewModel>;
}

/** Bounded exponential backoff policy. */
export interface GameShellRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface GameShellSubmitSuccessOutcome {
  status: 'applied' | 'duplicate';
  actionId: string;
  attempts: number;
  /** False when a newer confirmed view already exists; the view was not replaced. */
  viewApplied: boolean;
  revision: number;
  appliedRevision: number;
  viewRevision: number;
  view: PlayerViewModel;
  promptToken: string | undefined;
}

export interface GameShellSubmitRejectedOutcome {
  status: 'rejected';
  actionId: string;
  attempts: number;
  code: ActionErrorCode;
  /** Whether the caller may retry this intent later. The service itself did not. */
  retryable: boolean;
  /** True when a full authorized player resync replaced the confirmed view. */
  resynced: boolean;
}

export interface GameShellSubmitFailureOutcome {
  status: 'failed';
  actionId: string;
  attempts: number;
  reason: 'transport' | 'protocol' | 'resync';
  retryable: boolean;
  /** Stale code that triggered a failed resync, when applicable. */
  code?: ActionErrorCode;
  error?: unknown;
}

export type GameShellSubmitOutcome =
  | GameShellSubmitSuccessOutcome
  | GameShellSubmitRejectedOutcome
  | GameShellSubmitFailureOutcome;
