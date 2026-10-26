import {ACTION_SCHEMA_VERSION} from '@/common/actionProtocol/ActionProtocol';
import type {
  ActionErrorCode,
  ActionErrorResponseV1,
  ActionRequestV1,
  ActionResponseV1,
  ActionSuccessResponseV1,
} from '@/common/actionProtocol/ActionProtocol';
import type {InputResponse} from '@/common/inputs/InputResponse';
import type {GameId, PlayerId} from '@/common/Types';

import type {GameShellService} from './GameShellService';
import type {
  GameShellRetryPolicy,
  GameShellSubmitFailureOutcome,
  GameShellSubmitIntent,
  GameShellSubmitOutcome,
  GameShellSubmitRejectedOutcome,
  GameShellSubmitSuccessOutcome,
  GameShellTransport,
  GameShellTransportResponse,
} from './GameShellSubmitTypes';

const DEFAULT_RETRY_POLICY: GameShellRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 2000,
};

/** Keeps a settled actionId from producing a second transport effect. */
const MAX_SETTLED_OUTCOMES = 32;

const STALE_CODES: ReadonlySet<ActionErrorCode> = new Set<ActionErrorCode>([
  'STALE_PROMPT',
  'STALE_REVISION',
  'ENGINE_VERSION_MISMATCH',
]);

const ACTION_ERROR_CODES: ReadonlySet<string> = new Set<string>([
  'INVALID_SCHEMA',
  'UNAUTHORIZED',
  'ENGINE_VERSION_MISMATCH',
  'STALE_PROMPT',
  'STALE_REVISION',
  'INVALID_ACTION',
  'IDEMPOTENCY_CONFLICT',
  'RATE_LIMITED',
  'PERSISTENCE_FAILURE',
]);

type PendingSubmission = {
  readonly intent: GameShellSubmitIntent;
  readonly key: string;
  readonly request: ActionRequestV1;
  attempts: number;
};

type SettledOutcome = {
  readonly key: string;
  readonly outcome: GameShellSubmitOutcome;
};

type HandlerResult = GameShellSubmitOutcome | 'retry';

export interface GameShellSubmitServiceOptions {
  gameId: GameId;
  transport: GameShellTransport;
  shell: GameShellService;
  policy?: Partial<GameShellRetryPolicy>;
  /** Injectable for deterministic tests. Defaults to a timer-backed delay. */
  sleep?: (delayMs: number) => Promise<void>;
}

/**
 * Client-side v2 submit owner.
 *
 * Responsibilities:
 * - preserve one actionId across clicks and retries (per-actionId single flight);
 * - retry transient network/5xx failures with bounded exponential backoff;
 * - perform exactly one full GET player resync for stale 409 responses;
 * - never let a stale success response overwrite a newer confirmed view;
 * - leave validation/auth errors terminal with no retry.
 *
 * It does not own confirmed view state: GameShellService remains the only view
 * store, and the service only publishes server-authorized responses to it.
 */
export class GameShellSubmitService {
  private readonly gameId: GameId;
  private readonly transport: GameShellTransport;
  private readonly shell: GameShellService;
  private readonly policy: GameShellRetryPolicy;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly pending = new Map<string, PendingSubmission>();
  private readonly inFlight = new Map<string, Promise<GameShellSubmitOutcome>>();
  private readonly settled = new Map<string, SettledOutcome>();
  private lastServerViewRevision: number | undefined = undefined;
  private resyncInFlight: Promise<boolean> | undefined = undefined;

  public constructor(options: GameShellSubmitServiceOptions) {
    this.gameId = options.gameId;
    this.transport = options.transport;
    this.shell = options.shell;
    const requested = options.policy ?? {};
    const maxAttempts = requested.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts;
    const baseDelayMs = requested.baseDelayMs ?? DEFAULT_RETRY_POLICY.baseDelayMs;
    const maxDelayMs = requested.maxDelayMs ?? DEFAULT_RETRY_POLICY.maxDelayMs;
    this.policy = {
      maxAttempts: Number.isSafeInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : DEFAULT_RETRY_POLICY.maxAttempts,
      baseDelayMs: Number.isFinite(baseDelayMs) && baseDelayMs >= 0 ? baseDelayMs : DEFAULT_RETRY_POLICY.baseDelayMs,
      maxDelayMs: Number.isFinite(maxDelayMs) && maxDelayMs >= 0 ? maxDelayMs : DEFAULT_RETRY_POLICY.maxDelayMs,
    };
    this.sleep = options.sleep ?? defaultSleep;
  }

  public getPendingIntents(): ReadonlyArray<GameShellSubmitIntent> {
    return Array.from(this.pending.values(), (pending) => ({...pending.intent}));
  }

  public getPendingActionIds(): ReadonlyArray<string> {
    return Array.from(this.pending.keys());
  }

  public hasPendingAction(actionId: string): boolean {
    return this.pending.has(actionId);
  }

  /**
   * Submits an intent. A repeated call with the same actionId joins the
   * in-flight request, reuses a stored pending intent after a transient
   * failure, or returns the settled outcome without a second transport effect.
   */
  public submit(intent: Readonly<GameShellSubmitIntent>): Promise<GameShellSubmitOutcome> {
    const normalized = normalizeIntent(intent);
    const key = intentKey(normalized);
    const actionId = normalized.actionId;

    const running = this.inFlight.get(actionId);
    if (running !== undefined) {
      return running;
    }

    const settled = this.settled.get(actionId);
    if (settled !== undefined) {
      if (settled.key === key) {
        return Promise.resolve(settled.outcome);
      }
      return Promise.resolve(rejectedOutcome(actionId, 0, 'IDEMPOTENCY_CONFLICT', false, false));
    }

    let pending = this.pending.get(actionId);
    if (pending !== undefined) {
      if (pending.key !== key) {
        return Promise.resolve(rejectedOutcome(actionId, 0, 'IDEMPOTENCY_CONFLICT', false, false));
      }
    } else {
      pending = {
        intent: normalized,
        key,
        request: this.requestFor(normalized),
        attempts: 0,
      };
      this.pending.set(actionId, pending);
    }

    // Re-add after stop()/clearPending(); addPendingIntent is idempotent by actionId.
    this.shell.addPendingIntent({actionId, baseRevision: pending.intent.baseRevision});
    const promise = this.run(pending);
    this.inFlight.set(actionId, promise);
    return promise;
  }

  /** Resubmits the stored intent with its original actionId (no new key). */
  public retry(actionId: string): Promise<GameShellSubmitOutcome> {
    const running = this.inFlight.get(actionId);
    if (running !== undefined) {
      return running;
    }
    const pending = this.pending.get(actionId);
    if (pending !== undefined) {
      return this.submit(pending.intent);
    }
    const settled = this.settled.get(actionId);
    if (settled !== undefined) {
      return Promise.resolve(settled.outcome);
    }
    return Promise.reject(new Error('No pending submit intent for actionId ' + actionId));
  }

  /** Clears pending intents, e.g. after a stale conflict or on logout. */
  public clearPending(): void {
    this.pending.clear();
    this.shell.clearPendingIntents();
  }

  /** Drops local state. Does not cancel an already-sent transport request. */
  public reset(): void {
    this.clearPending();
    this.settled.clear();
    this.lastServerViewRevision = undefined;
  }

  private requestFor(intent: GameShellSubmitIntent): ActionRequestV1 {
    return {
      v: ACTION_SCHEMA_VERSION,
      gameId: this.gameId,
      actionId: intent.actionId,
      baseRevision: intent.baseRevision,
      promptToken: intent.promptToken,
      engineVersion: intent.engineVersion,
      input: intent.input,
    };
  }

  private async run(pending: PendingSubmission): Promise<GameShellSubmitOutcome> {
    const actionId = pending.intent.actionId;
    try {
      for (let attempt = 1; attempt <= this.policy.maxAttempts; attempt++) {
        pending.attempts = attempt;
        // A view confirmed after this send makes its response stale.
        const shellRevisionAtSend = this.shell.getViewRevision();
        let response: GameShellTransportResponse;
        try {
          response = await this.transport.post(pending.request);
        } catch (error) {
          if (attempt < this.policy.maxAttempts) {
            await this.sleep(this.delayFor(attempt));
            continue;
          }
          return this.transportFailure(pending, attempt, error);
        }

        const result = await this.handleResponse(pending, response, attempt, shellRevisionAtSend);
        if (result === 'retry') {
          if (attempt < this.policy.maxAttempts) {
            await this.sleep(this.delayFor(attempt));
            continue;
          }
          return this.transportFailure(pending, attempt);
        }
        return result;
      }
      return this.transportFailure(pending, pending.attempts);
    } finally {
      this.inFlight.delete(actionId);
    }
  }

  private async handleResponse(
    pending: PendingSubmission,
    response: GameShellTransportResponse,
    attempt: number,
    shellRevisionAtSend: number,
  ): Promise<HandlerResult> {
    const actionId = pending.intent.actionId;

    if (response.statusCode >= 200 && response.statusCode < 300 && isSuccessBody(response.body)) {
      if (response.body.actionId !== actionId) {
        return this.protocolFailure(pending, attempt);
      }
      const viewApplied = this.applyConfirmedView(response.body, shellRevisionAtSend);
      const outcome: GameShellSubmitSuccessOutcome = {
        status: response.body.status,
        actionId,
        attempts: attempt,
        viewApplied,
        revision: safeRevision(response.body.revision, response.body.viewRevision),
        appliedRevision: safeRevision(response.body.appliedRevision, response.body.viewRevision),
        viewRevision: response.body.viewRevision,
        view: response.body.view,
        promptToken: response.body.promptToken,
      };
      return this.settle(pending, outcome);
    }

    const error = isRejectedBody(response.body) ? response.body : undefined;

    if (response.statusCode === 409 && error !== undefined && STALE_CODES.has(error.code)) {
      return await this.handleStale(pending, error, attempt);
    }

    if (response.statusCode >= 500 && (error === undefined || error.retryable !== false)) {
      return 'retry';
    }

    const code = error !== undefined && isKnownErrorCode(error.code) ? error.code : codeForStatus(response.statusCode);
    const retryable = error !== undefined && error.retryable === true;
    return this.settle(pending, rejectedOutcome(actionId, attempt, code, retryable, false));
  }

  private async handleStale(
    pending: PendingSubmission,
    error: ActionErrorResponseV1,
    attempt: number,
  ): Promise<GameShellSubmitOutcome> {
    // The conflict invalidates every locally pending baseRevision/promptToken.
    this.clearPending();
    const resynced = await this.resyncOnce();
    if (!resynced) {
      return {
        status: 'failed',
        actionId: pending.intent.actionId,
        attempts: attempt,
        reason: 'resync',
        retryable: false,
        code: error.code,
      };
    }
    const outcome: GameShellSubmitRejectedOutcome = {
      status: 'rejected',
      actionId: pending.intent.actionId,
      attempts: attempt,
      code: error.code,
      retryable: false,
      resynced: true,
    };
    this.remember(pending.key, outcome);
    return outcome;
  }

  private resyncOnce(): Promise<boolean> {
    if (this.resyncInFlight !== undefined) {
      return this.resyncInFlight;
    }
    const revisionAtStart = this.shell.getViewRevision();
    const playerId = this.shell.getConfirmedView()?.id;
    const resync = this.performResync(revisionAtStart, playerId);
    this.resyncInFlight = resync;
    return resync;
  }

  private async performResync(
    revisionAtStart: number,
    playerId: PlayerId | undefined,
  ): Promise<boolean> {
    try {
      const view = await this.transport.fetchPlayerView(playerId);
      // A success that landed while the GET was in flight is newer; keep it.
      if (this.shell.getViewRevision() === revisionAtStart) {
        this.lastServerViewRevision = undefined;
        this.shell.setConfirmedView(view);
      }
      return true;
    } catch {
      return false;
    } finally {
      this.resyncInFlight = undefined;
    }
  }

  private applyConfirmedView(body: ActionSuccessResponseV1, shellRevisionAtSend: number): boolean {
    if (this.shell.getViewRevision() !== shellRevisionAtSend) {
      return false;
    }
    if (this.lastServerViewRevision !== undefined && body.viewRevision < this.lastServerViewRevision) {
      return false;
    }
    this.lastServerViewRevision = body.viewRevision;
    this.shell.setConfirmedView(body.view);
    return true;
  }

  private settle(pending: PendingSubmission, outcome: GameShellSubmitOutcome): GameShellSubmitOutcome {
    this.pending.delete(pending.intent.actionId);
    this.shell.removePendingIntent(pending.intent.actionId);
    this.remember(pending.key, outcome);
    return outcome;
  }

  private remember(key: string, outcome: GameShellSubmitOutcome): void {
    this.settled.delete(outcome.actionId);
    this.settled.set(outcome.actionId, {key, outcome});
    while (this.settled.size > MAX_SETTLED_OUTCOMES) {
      const oldest = this.settled.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.settled.delete(oldest);
    }
  }

  private transportFailure(
    pending: PendingSubmission,
    attempts: number,
    error?: unknown,
  ): GameShellSubmitFailureOutcome {
    const outcome: GameShellSubmitFailureOutcome = {
      status: 'failed',
      actionId: pending.intent.actionId,
      attempts,
      reason: 'transport',
      retryable: true,
    };
    if (error !== undefined) {
      outcome.error = error;
    }
    return outcome;
  }

  private protocolFailure(pending: PendingSubmission, attempts: number): GameShellSubmitFailureOutcome {
    // Keep the pending intent: retrying the same actionId is safe and may
    // recover the authoritative response after a malformed/truncated body.
    return {
      status: 'failed',
      actionId: pending.intent.actionId,
      attempts,
      reason: 'protocol',
      retryable: false,
    };
  }

  private delayFor(attempt: number): number {
    const exponential = this.policy.baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(exponential, this.policy.maxDelayMs);
  }
}

function defaultSleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function normalizeIntent(intent: Readonly<GameShellSubmitIntent>): GameShellSubmitIntent {
  if (typeof intent.actionId !== 'string' || intent.actionId.length === 0) {
    throw new Error('GameShellSubmitIntent requires a non-empty actionId');
  }
  if (!Number.isSafeInteger(intent.baseRevision) || intent.baseRevision < 0) {
    throw new Error('GameShellSubmitIntent requires a non-negative integer baseRevision');
  }
  if (typeof intent.promptToken !== 'string' || intent.promptToken.length === 0) {
    throw new Error('GameShellSubmitIntent requires a server-issued promptToken');
  }
  if (typeof intent.engineVersion !== 'string' || intent.engineVersion.length === 0) {
    throw new Error('GameShellSubmitIntent requires an engineVersion');
  }
  if (typeof intent.input !== 'object' || intent.input === null || Array.isArray(intent.input)) {
    throw new Error('GameShellSubmitIntent requires an input object');
  }
  return {
    actionId: intent.actionId,
    baseRevision: intent.baseRevision,
    promptToken: intent.promptToken,
    engineVersion: intent.engineVersion,
    input: cloneInput(intent.input),
  };
}

function cloneInput(input: InputResponse): InputResponse {
  return JSON.parse(JSON.stringify(input)) as InputResponse;
}

function intentKey(intent: GameShellSubmitIntent): string {
  return JSON.stringify(intent);
}

function rejectedOutcome(
  actionId: string,
  attempts: number,
  code: ActionErrorCode,
  retryable: boolean,
  resynced: boolean,
): GameShellSubmitRejectedOutcome {
  return {status: 'rejected', actionId, attempts, code, retryable, resynced};
}

function isSuccessBody(body: ActionResponseV1 | undefined): body is ActionSuccessResponseV1 {
  if (body === undefined) {
    return false;
  }
  if (body.status !== 'applied' && body.status !== 'duplicate') {
    return false;
  }
  return typeof body.actionId === 'string' &&
    typeof body.view === 'object' && body.view !== null &&
    Number.isSafeInteger(body.viewRevision) && body.viewRevision >= 0;
}

function isRejectedBody(body: ActionResponseV1 | undefined): body is ActionErrorResponseV1 {
  return body !== undefined && body.status === 'rejected' && typeof body.code === 'string';
}

function isKnownErrorCode(code: string): code is ActionErrorCode {
  return ACTION_ERROR_CODES.has(code);
}

function safeRevision(value: number, fallback: number): number {
  return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function codeForStatus(statusCode: number): ActionErrorCode {
  if (statusCode === 400 || statusCode === 413) {
    return 'INVALID_SCHEMA';
  }
  if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
    return 'UNAUTHORIZED';
  }
  if (statusCode === 409) {
    return 'IDEMPOTENCY_CONFLICT';
  }
  if (statusCode === 422) {
    return 'INVALID_ACTION';
  }
  if (statusCode === 429) {
    return 'RATE_LIMITED';
  }
  return 'PERSISTENCE_FAILURE';
}
