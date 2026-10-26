import {ACTION_SCHEMA_VERSION, ActionBootstrapResponseV1, ActionErrorCode, ActionErrorResponseV1, ActionSuccessResponseV1, ActionRequestV1, ActionResponseV1, ActionUndoSuccessResponseV1, BootstrapResponseV1, MAX_ACTION_REQUEST_BYTES, UndoRequestV1, UndoResponseV1} from '../../common/actionProtocol/ActionProtocol';
import {canonicalActionPayload} from '../../common/actionProtocol/canonicalActionPayload';
import {parseActionRequestJson} from '../../common/actionProtocol/parseActionRequest';
import {InputResponse} from '../../common/inputs/InputResponse';
import {PlayerViewModel} from '../../common/models/PlayerModel';
import {GameId, PlayerId} from '../../common/Types';
import {
  ActionIdConflictError,
  ActionStream,
  ActionIntent,
  ActionPayload,
  AppendActionIntentResult,
  GenesisMismatchError,
  IActionStore,
  InvalidActionGenesisError,
  InvalidActionIntentError,
  RevisionConflictError,
  StaleEpochError,
  StreamNotFoundError,
  canonicalJson,
  sha256Hex,
} from '../actionStore';
import {ACTION_INTENT_TYPE, ActionRecovery, ActionRecoveryError, RecoveredState, UNDO_INTENT_TYPE, parseV2IntentPayload} from '../actionRecovery';
import {EnginePromptSnapshot} from '../engine/EngineCanonical';
import {EngineInputError, UnsupportedEngineConfigError} from '../engine/EngineErrors';
import {IGame} from '../IGame';
import {IPlayer} from '../IPlayer';
import {InputError} from '../inputs/InputError';
import {ActionEnginePort, ActionEngineState} from './ActionEnginePort';
import {computePromptToken} from './PromptToken';
import {GenesisBinding, stateHashOf, viewHashOf} from './StateBinding';

const STATUS = {
  ok: 200,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  payloadTooLarge: 413,
  unprocessableEntity: 422,
  internalServerError: 500,
  serviceUnavailable: 503,
} as const;

export type ActionPrincipal = {
  readonly id: string;
};

export interface ActionGameSource {
  getGame(id: GameId): Promise<IGame | undefined>;
}

export type ActionLegalityContext = {
  game: IGame;
  actor: IPlayer;
  request: ActionRequestV1;
};

export type ActionLegalityDecision =
  | {allowed: true}
  | {allowed: false; code: ActionErrorCode; statusCode?: number};

/**
 * Server-side phase/prompt legality hook. The gateway already proves that the
 * actor owns a seat, the prompt token is current, and the base revision is the
 * journal head; this hook carries any additional phase rules.
 */
export type ActionLegalityHook = (context: ActionLegalityContext) => ActionLegalityDecision;

export type ActionGatewayOptions = {
  store: IActionStore;
  engine: ActionEnginePort;
  engineVersion: string;
  /** HMAC secret; never persisted or returned to clients. */
  promptTokenSecret: string;
  /** Optional test-cohort allowlist. When set, other games fail closed with 404. */
  allowedGameIds?: ReadonlySet<GameId>;
  legality?: ActionLegalityHook;
  /** Recovery seam; defaults to genesis + journal replay over the same store. */
  recovery?: ActionRecovery;
};

export type ActionGatewayRequest = {
  principal?: ActionPrincipal;
  rawBody: string;
  games: ActionGameSource;
};

export type ActionGatewayResult = {
  statusCode: number;
  body: ActionResponseV1;
};

export type ActionUndoGatewayRequest = {
  principal?: ActionPrincipal;
  rawBody: string;
  games: ActionGameSource;
};

export type ActionUndoGatewayResult = {
  statusCode: number;
  body: UndoResponseV1;
};

/**
 * Full authorized resync request. The actor is resolved from the live game's
 * seat, so a caller can only bootstrap its own view.
 */
export type ActionBootstrapGatewayRequest = {
  principal?: ActionPrincipal;
  game: IGame;
  actorId: PlayerId;
};

export type ActionBootstrapGatewayResult = {
  statusCode: number;
  body: BootstrapResponseV1;
};

type CachedGameState = {
  game: IGame;
  state: ActionEngineState;
  genesis: GenesisBinding;
  /** Effective journal revision represented by `state`. */
  revision: number;
};

type AuthoritativeState = CachedGameState & {
  stream: ActionStream;
};

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function fingerprintOf(request: ActionRequestV1): string {
  return sha256Hex(canonicalActionPayload(request));
}

function storedFingerprint(intent: ActionIntent): string | undefined {
  const payload = intent.payload;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return undefined;
  }
  const value = (payload as Record<string, unknown>).requestFingerprint;
  return typeof value === 'string' ? value : undefined;
}

function jsonValue(input: InputResponse): ActionPayload {
  return JSON.parse(JSON.stringify(input)) as ActionPayload;
}

function promptMetadata(gameId: GameId, actorId: PlayerId, revision: number, prompt: EnginePromptSnapshot) {
  return {
    promptId: sha256Hex(canonicalJson({
      gameId,
      actorId,
      revision,
      promptType: prompt.type,
      promptFingerprint: prompt.fingerprint,
    })),
    promptType: prompt.type,
    promptFingerprint: prompt.fingerprint,
  };
}

function rejectedBody(
  code: ActionErrorCode,
  fields: Partial<ActionErrorResponseV1> = {},
): ActionErrorResponseV1 {
  return {
    v: ACTION_SCHEMA_VERSION,
    status: 'rejected',
    code,
    ...fields,
  };
}

function rejected(
  statusCode: number,
  code: ActionErrorCode,
  fields: Partial<ActionErrorResponseV1> = {},
): ActionGatewayResult {
  return {statusCode, body: rejectedBody(code, fields)};
}

/** Strict parser for the undo envelope; never trusts extra fields. */
function parseUndoRequestJson(rawBody: string): UndoRequestV1 | undefined {
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch (_err) {
    return undefined;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.v !== ACTION_SCHEMA_VERSION) {
    return undefined;
  }
  if (typeof record.gameId !== 'string' || record.gameId.length === 0 || record.gameId.length > 128) {
    return undefined;
  }
  if (typeof record.actionId !== 'string' || record.actionId.length === 0 || record.actionId.length > 200) {
    return undefined;
  }
  if (typeof record.baseRevision !== 'number' ||
      !Number.isSafeInteger(record.baseRevision) ||
      record.baseRevision < 0) {
    return undefined;
  }
  if (typeof record.engineVersion !== 'string' || record.engineVersion.length === 0) {
    return undefined;
  }
  return {
    v: ACTION_SCHEMA_VERSION,
    gameId: record.gameId as GameId,
    actionId: record.actionId,
    baseRevision: record.baseRevision,
    engineVersion: record.engineVersion,
  };
}

/**
 * Authoritative v2 action gateway.
 *
 * Responsibilities, in order: authenticated principal, schema parsing,
 * ownership/seat derivation, engine version, idempotency lookup, prompt
 * legality, isolated candidate apply, and append-only journal commit with CAS
 * and epoch fencing. The live game is never mutated; commit/recovery is A5b.
 */
export class ActionGateway {
  private readonly store: IActionStore;
  private readonly engine: ActionEnginePort;
  private readonly engineVersion: string;
  private readonly promptTokenSecret: string;
  private readonly allowedGameIds: ReadonlySet<GameId> | undefined;
  private readonly legality: ActionLegalityHook | undefined;
  private readonly recovery: ActionRecovery;
  private readonly cached = new Map<GameId, CachedGameState>();
  private initialized = false;

  public constructor(options: ActionGatewayOptions) {
    if (options.engineVersion.length === 0) {
      throw new Error('ActionGateway requires an engine version');
    }
    if (options.promptTokenSecret.length === 0) {
      throw new Error('ActionGateway requires a prompt token secret');
    }
    this.store = options.store;
    this.engine = options.engine;
    this.engineVersion = options.engineVersion;
    this.promptTokenSecret = options.promptTokenSecret;
    this.allowedGameIds = options.allowedGameIds;
    this.legality = options.legality;
    this.recovery = options.recovery ?? new ActionRecovery({store: options.store, engine: options.engine});
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.store.initialize();
    this.initialized = true;
  }

  public async handle(request: ActionGatewayRequest): Promise<ActionGatewayResult> {
    const principal = request.principal;
    if (principal === undefined || typeof principal.id !== 'string' || principal.id.length === 0) {
      return rejected(STATUS.unauthorized, 'UNAUTHORIZED');
    }
    if (typeof request.rawBody !== 'string') {
      return rejected(STATUS.badRequest, 'INVALID_SCHEMA');
    }
    if (byteLength(request.rawBody) > MAX_ACTION_REQUEST_BYTES) {
      return rejected(STATUS.payloadTooLarge, 'INVALID_SCHEMA');
    }
    const parsed = parseActionRequestJson(request.rawBody);
    if (!parsed.ok) {
      return rejected(STATUS.badRequest, 'INVALID_SCHEMA');
    }
    const envelope = parsed.value;

    let game: IGame | undefined;
    try {
      game = await request.games.getGame(envelope.gameId);
    } catch (_err) {
      return rejected(STATUS.serviceUnavailable, 'PERSISTENCE_FAILURE', {retryable: true});
    }
    if (game === undefined || game.id !== envelope.gameId) {
      return rejected(STATUS.notFound, 'UNAUTHORIZED');
    }
    if (this.allowedGameIds !== undefined && !this.allowedGameIds.has(game.id)) {
      return rejected(STATUS.notFound, 'UNAUTHORIZED');
    }

    const actor = this.authorizedActor(game, principal.id);
    if (actor === undefined) {
      return rejected(STATUS.forbidden, 'UNAUTHORIZED');
    }
    if (envelope.engineVersion !== this.engineVersion) {
      return rejected(STATUS.conflict, 'ENGINE_VERSION_MISMATCH', {resync: 'full'});
    }

    try {
      await this.initialize();
    } catch (_err) {
      return rejected(STATUS.serviceUnavailable, 'PERSISTENCE_FAILURE', {retryable: true});
    }

    // Legality runs before the journal anchor is touched: a request that can
    // never be accepted must not create recovery state.
    if (this.legality !== undefined) {
      const decision = this.legality({game, actor, request: envelope});
      if (!decision.allowed) {
        return rejected(decision.statusCode ?? STATUS.unprocessableEntity, decision.code);
      }
    }

    // The journal is authoritative. The live game seeds the genesis anchor on
    // the very first action and is never replayed, so a background save that
    // bumps lastSaveId cannot invalidate the v2 head.
    let authoritative: AuthoritativeState;
    try {
      authoritative = await this.authoritativeState(game);
    } catch (err) {
      return this.recoveryRejection(err);
    }
    const headRevision = authoritative.revision;

    let existing: ActionIntent | undefined;
    try {
      existing = await this.store.getIntent(game.id, envelope.actionId);
    } catch (_err) {
      return rejected(STATUS.serviceUnavailable, 'PERSISTENCE_FAILURE', {retryable: true});
    }
    if (existing !== undefined) {
      return this.duplicateResult(actor, envelope, authoritative.state, headRevision, existing);
    }

    if (envelope.baseRevision !== headRevision) {
      // The current token lets the client recover without an extra round trip.
      const currentPromptToken = this.promptToken(authoritative.state, actor.id, headRevision + 1);
      return rejected(STATUS.conflict, 'STALE_REVISION', {
        currentRevision: headRevision,
        resync: 'full',
        ...(currentPromptToken === undefined ? {} : {currentPromptToken}),
      });
    }

    const prompt = authoritative.state.prompt(actor.id);
    if (prompt === null) {
      return rejected(STATUS.conflict, 'STALE_PROMPT', {currentRevision: headRevision, resync: 'full'});
    }
    const expectedPromptToken = computePromptToken(this.promptTokenSecret, {
      gameId: game.id,
      actorId: actor.id,
      revision: headRevision + 1,
      prompt,
    });
    if (envelope.promptToken !== expectedPromptToken) {
      return rejected(STATUS.conflict, 'STALE_PROMPT', {
        currentRevision: headRevision,
        currentPromptToken: expectedPromptToken,
        resync: 'full',
      });
    }

    let candidate: ActionEngineState;
    try {
      candidate = this.engine.applyCandidate(authoritative.state, actor.id, envelope.input);
    } catch (err) {
      if (err instanceof InputError || err instanceof EngineInputError) {
        return rejected(STATUS.unprocessableEntity, 'INVALID_ACTION');
      }
      throw err;
    }
    if (candidate.gameId !== game.id) {
      throw new Error('Candidate engine changed the game id');
    }
    const candidateHash = stateHashOf(candidate.serialize());

    // The append is the single commit point: the response is written only
    // after the journal accepted the intent, and the recorded state hash lets
    // recovery prove the effect later. A store failure therefore leaves no
    // partial state behind.
    const requestFingerprint = fingerprintOf(envelope);
    let result: AppendActionIntentResult;
    try {
      result = await this.store.appendIntent({
        gameId: game.id,
        expectedRevision: headRevision,
        genesisId: authoritative.genesis.genesisId,
        epoch: authoritative.stream.epoch,
        actionId: envelope.actionId,
        actorId: actor.id,
        intentType: ACTION_INTENT_TYPE,
        payload: {
          kind: 'action',
          requestFingerprint,
          baseRevision: envelope.baseRevision,
          engineVersion: envelope.engineVersion,
          promptTokenHash: sha256Hex(envelope.promptToken),
          input: jsonValue(envelope.input),
          stateHashAfter: candidateHash,
        },
        prompt: promptMetadata(game.id, actor.id, headRevision + 1, prompt),
      });
    } catch (err) {
      return this.storeRejection(err, headRevision);
    }

    if (result.status === 'appended') {
      this.cached.set(game.id, {
        game,
        state: candidate,
        genesis: authoritative.genesis,
        revision: result.stream.revision,
      });
      return this.successResult(
        'applied',
        envelope,
        result.stream.revision,
        result.intent.revision,
        candidate.view(actor.id),
        this.promptToken(candidate, actor.id, result.stream.revision + 1),
      );
    }

    // A concurrent request with the same actionId won the append race. Its
    // payload is identical, so the head it produced is our candidate only when
    // it is still the head; otherwise the client must resync.
    if (result.intent.revision !== result.stream.revision) {
      return rejected(STATUS.conflict, 'STALE_REVISION', {
        currentRevision: result.stream.revision,
        resync: 'full',
      });
    }
    this.cached.set(game.id, {
      game,
      state: candidate,
      genesis: authoritative.genesis,
      revision: result.stream.revision,
    });
    return this.successResult(
      'duplicate',
      envelope,
      result.stream.revision,
      result.intent.revision,
      candidate.view(actor.id),
      this.promptToken(candidate, actor.id, result.stream.revision + 1),
    );
  }

  private authorizedActor(game: IGame, userId: string): IPlayer | undefined {
    const matches = game.players.filter((player) => player.user !== undefined && player.user === userId);
    return matches.length === 1 ? matches[0] : undefined;
  }

  /**
   * Returns the authoritative state for a game.
   *
   * The first call for a game opens the journal anchor from the live snapshot;
   * every later call recovers genesis plus replay. A cached state is reused only
   * while it still represents the current journal head.
   */
  private async authoritativeState(game: IGame): Promise<AuthoritativeState> {
    let stream = await this.store.getStream(game.id);
    if (stream === undefined) {
      await this.recovery.ensureStream(game);
      stream = await this.store.getStream(game.id);
      if (stream === undefined) {
        throw new ActionRecoveryError('STREAM_MISSING', 'the action journal could not be opened');
      }
    }
    const cached = this.cached.get(game.id);
    if (cached !== undefined && cached.game === game && cached.revision === stream.revision) {
      return {...cached, stream};
    }
    const recovered = await this.recovery.recover({gameId: game.id, liveGame: game});
    const next: AuthoritativeState = {
      game,
      state: recovered.state,
      genesis: {
        genesisId: stream.genesisId,
        baseSaveId: stream.baseSaveId,
        stateHash: stream.stateHash,
      },
      revision: recovered.revision,
      stream: recovered.stream,
    };
    this.cached.set(game.id, {
      game: next.game,
      state: next.state,
      genesis: next.genesis,
      revision: next.revision,
    });
    return next;
  }

  private recoveryRejection(err: unknown): ActionGatewayResult {
    if (err instanceof ActionRecoveryError) {
      console.warn('v2 recovery failed', err.code);
      return rejected(STATUS.serviceUnavailable, 'RECOVERY_FAILED', {retryable: true, resync: 'full'});
    }
    if (err instanceof UnsupportedEngineConfigError) {
      return rejected(STATUS.unprocessableEntity, 'INVALID_ACTION');
    }
    if (err instanceof GenesisMismatchError ||
        err instanceof InvalidActionGenesisError ||
        err instanceof StreamNotFoundError) {
      return rejected(STATUS.conflict, 'STALE_REVISION', {resync: 'full'});
    }
    console.warn('v2 authoritative state failed', err instanceof Error ? err.name : 'unknown');
    return rejected(STATUS.serviceUnavailable, 'PERSISTENCE_FAILURE', {retryable: true});
  }

  private undoRejection(err: unknown): ActionUndoGatewayResult {
    if (err instanceof ActionRecoveryError) {
      console.warn('v2 undo recovery failed', err.code);
      return {
        statusCode: STATUS.serviceUnavailable,
        body: rejectedBody('RECOVERY_FAILED', {retryable: true, resync: 'full'}),
      };
    }
    if (err instanceof GenesisMismatchError || err instanceof StreamNotFoundError) {
      return {statusCode: STATUS.conflict, body: rejectedBody('STALE_REVISION', {resync: 'full'})};
    }
    console.warn('v2 undo failed', err instanceof Error ? err.name : 'unknown');
    return {
      statusCode: STATUS.serviceUnavailable,
      body: rejectedBody('PERSISTENCE_FAILURE', {retryable: true}),
    };
  }

  private duplicateResult(
    actor: IPlayer,
    request: ActionRequestV1,
    state: ActionEngineState,
    headRevision: number,
    existing: ActionIntent,
  ): ActionGatewayResult {
    if (storedFingerprint(existing) !== fingerprintOf(request)) {
      return rejected(STATUS.conflict, 'IDEMPOTENCY_CONFLICT', {actionId: request.actionId});
    }
    // The recovered head is authoritative, so an exact retry can be answered
    // with the current view and the next prompt token instead of a resync.
    return this.successResult(
      'duplicate',
      request,
      headRevision,
      existing.revision,
      state.view(actor.id),
      this.promptToken(state, actor.id, headRevision + 1),
    );
  }

  /**
   * Full authorized resync: current revision, server-issued prompt token, and
   * the actor-scoped view recovered from genesis plus replay.
   */
  public async bootstrap(request: ActionBootstrapGatewayRequest): Promise<ActionBootstrapGatewayResult> {
    const principal = request.principal;
    if (principal === undefined || typeof principal.id !== 'string' || principal.id.length === 0) {
      return {statusCode: STATUS.unauthorized, body: rejectedBody('UNAUTHORIZED')};
    }
    const game = request.game;
    if (this.allowedGameIds !== undefined && !this.allowedGameIds.has(game.id)) {
      return {statusCode: STATUS.notFound, body: rejectedBody('UNAUTHORIZED')};
    }
    const actor = this.authorizedActor(game, principal.id);
    if (actor === undefined || actor.id !== request.actorId) {
      return {statusCode: STATUS.forbidden, body: rejectedBody('UNAUTHORIZED')};
    }
    try {
      await this.initialize();
    } catch (_err) {
      return {statusCode: STATUS.serviceUnavailable, body: rejectedBody('PERSISTENCE_FAILURE', {retryable: true})};
    }
    let authoritative: AuthoritativeState;
    try {
      authoritative = await this.authoritativeState(game);
    } catch (err) {
      const failure = this.recoveryRejection(err);
      return {statusCode: failure.statusCode, body: failure.body as ActionErrorResponseV1};
    }
    const prompt = authoritative.state.prompt(actor.id);
    const promptToken = this.promptToken(authoritative.state, actor.id, authoritative.revision + 1);
    const view = authoritative.state.view(actor.id);
    const body: ActionBootstrapResponseV1 = {
      v: ACTION_SCHEMA_VERSION,
      status: 'ready',
      gameId: game.id,
      playerId: actor.id,
      revision: authoritative.revision,
      baseRevision: authoritative.revision,
      engineVersion: this.engineVersion,
      view,
      viewRevision: authoritative.revision,
      viewHash: viewHashOf(view),
      ...(promptToken === undefined ? {} : {promptToken}),
      ...(prompt === null ? {} : {promptType: prompt.type, promptFingerprint: prompt.fingerprint}),
    };
    return {statusCode: STATUS.ok, body};
  }

  /**
   * Appends an undo intent instead of restoring an old save.
   *
   * The journal keeps every accepted action; the undo only removes the effect
   * of everything after the actor's own last effective action. The stream epoch
   * advances so a writer that observed the pre-undo epoch is fenced out.
   */
  public async handleUndo(request: ActionUndoGatewayRequest): Promise<ActionUndoGatewayResult> {
    const principal = request.principal;
    if (principal === undefined || typeof principal.id !== 'string' || principal.id.length === 0) {
      return {statusCode: STATUS.unauthorized, body: rejectedBody('UNAUTHORIZED')};
    }
    if (typeof request.rawBody !== 'string') {
      return {statusCode: STATUS.badRequest, body: rejectedBody('INVALID_SCHEMA')};
    }
    if (byteLength(request.rawBody) > MAX_ACTION_REQUEST_BYTES) {
      return {statusCode: STATUS.payloadTooLarge, body: rejectedBody('INVALID_SCHEMA')};
    }
    const envelope = parseUndoRequestJson(request.rawBody);
    if (envelope === undefined) {
      return {statusCode: STATUS.badRequest, body: rejectedBody('INVALID_SCHEMA')};
    }

    let game: IGame | undefined;
    try {
      game = await request.games.getGame(envelope.gameId);
    } catch (_err) {
      return {statusCode: STATUS.serviceUnavailable, body: rejectedBody('PERSISTENCE_FAILURE', {retryable: true})};
    }
    if (game === undefined || game.id !== envelope.gameId) {
      return {statusCode: STATUS.notFound, body: rejectedBody('UNAUTHORIZED')};
    }
    if (this.allowedGameIds !== undefined && !this.allowedGameIds.has(game.id)) {
      return {statusCode: STATUS.notFound, body: rejectedBody('UNAUTHORIZED')};
    }
    const actor = this.authorizedActor(game, principal.id);
    if (actor === undefined) {
      return {statusCode: STATUS.forbidden, body: rejectedBody('UNAUTHORIZED')};
    }
    if (envelope.engineVersion !== this.engineVersion) {
      return {statusCode: STATUS.conflict, body: rejectedBody('ENGINE_VERSION_MISMATCH', {resync: 'full'})};
    }
    try {
      await this.initialize();
    } catch (_err) {
      return {statusCode: STATUS.serviceUnavailable, body: rejectedBody('PERSISTENCE_FAILURE', {retryable: true})};
    }

    // Without an engine-side disclosure proof an undo could hide information a
    // player has already seen, so it is refused entirely.
    const undoGuard = this.engine.revealsHiddenInformation?.bind(this.engine);

    if (undoGuard === undefined) {
      return {statusCode: STATUS.unprocessableEntity, body: rejectedBody('UNDO_REJECTED')};
    }

    let head: RecoveredState;
    try {
      head = await this.recovery.recover({gameId: game.id, liveGame: game});
    } catch (err) {
      return this.undoRejection(err);
    }
    // Idempotency is checked before the CAS token: a retry of an undo that was
    // committed but never acknowledged must not be rejected as stale.
    let existing: ActionIntent | undefined;
    try {
      existing = await this.store.getIntent(game.id, envelope.actionId);
    } catch (_err) {
      return {statusCode: STATUS.serviceUnavailable, body: rejectedBody('PERSISTENCE_FAILURE', {retryable: true})};
    }
    if (existing !== undefined) {
      let parsedKind: string | undefined;
      let parsedTarget = 0;
      try {
        const parsed = parseV2IntentPayload(existing);
        parsedKind = parsed.kind;
        parsedTarget = parsed.kind === 'undo' ? parsed.targetRevision : 0;
      } catch (_err) {
        parsedKind = undefined;
      }
      if (parsedKind !== 'undo' || storedFingerprint(existing) !== this.undoFingerprint(envelope)) {
        return {statusCode: STATUS.conflict, body: rejectedBody('IDEMPOTENCY_CONFLICT', {actionId: envelope.actionId})};
      }
      let current: RecoveredState;
      try {
        current = await this.recovery.recover({gameId: game.id, liveGame: game});
      } catch (err) {
        return this.undoRejection(err);
      }
      return this.undoSuccess(envelope, current.state, current.revision, existing.revision, parsedTarget, actor.id);
    }

    if (envelope.baseRevision !== head.revision) {
      return {
        statusCode: STATUS.conflict,
        body: rejectedBody('STALE_REVISION', {currentRevision: head.revision, resync: 'full'}),
      };
    }

    const ownActions = head.plan.actions.filter((entry) => entry.intent.actorId === actor.id);
    const target = ownActions[ownActions.length - 1];
    if (target === undefined) {
      return {statusCode: STATUS.unprocessableEntity, body: rejectedBody('UNDO_REJECTED', {currentRevision: head.revision})};
    }
    // Undoing an action restores the state before it was applied, so the state
    // that must be proven is the one after the previous effective action.
    const targetPosition = head.plan.actions.findIndex(
      (entry) => entry.intent.revision === target.intent.revision,
    );
    const restoredRevision = targetPosition <= 0 ? 0 : head.plan.actions[targetPosition - 1].intent.revision;

    let restored: RecoveredState;
    try {
      restored = await this.recovery.recover({
        gameId: game.id,
        liveGame: game,
        captureRevision: restoredRevision,
      });
    } catch (err) {
      return this.undoRejection(err);
    }
    if (restored.capturedState === undefined || restored.capturedStateHash === undefined) {
      return {statusCode: STATUS.unprocessableEntity, body: rejectedBody('UNDO_REJECTED', {currentRevision: head.revision})};
    }
    if (restored.revision !== head.revision) {
      return {
        statusCode: STATUS.conflict,
        body: rejectedBody('STALE_REVISION', {currentRevision: restored.revision, resync: 'full'}),
      };
    }

    let revealed: boolean;
    try {
      revealed = undoGuard(restored.state, restored.capturedState, actor.id);
    } catch (_err) {
      return {statusCode: STATUS.serviceUnavailable, body: rejectedBody('PERSISTENCE_FAILURE', {retryable: true})};
    }
    if (revealed) {
      return {
        statusCode: STATUS.unprocessableEntity,
        body: rejectedBody('UNDO_HIDDEN_INFORMATION', {currentRevision: head.revision}),
      };
    }

    let result: AppendActionIntentResult;
    try {
      result = await this.store.appendIntent({
        gameId: game.id,
        expectedRevision: head.revision,
        genesisId: head.stream.genesisId,
        epoch: head.stream.epoch,
        actionId: envelope.actionId,
        actorId: actor.id,
        intentType: UNDO_INTENT_TYPE,
        payload: {
          kind: 'undo',
          requestFingerprint: this.undoFingerprint(envelope),
          baseRevision: envelope.baseRevision,
          engineVersion: envelope.engineVersion,
          targetRevision: target.intent.revision,
          undoneActionId: target.intent.actionId,
          stateHashBefore: head.stateHash,
          stateHashAfter: restored.capturedStateHash,
        },
        prompt: undefined,
      });
    } catch (err) {
      return this.undoRejection(err);
    }

    // The append is the commit point; the epoch bump only fences out writers
    // that still hold the pre-undo epoch, so a fencing failure must not turn a
    // durable undo into an error response.
    try {
      await this.store.fenceStream({gameId: game.id, expectedEpoch: head.stream.epoch});
    } catch (err) {
      console.warn('v2 undo epoch fence failed', err instanceof Error ? err.name : 'unknown');
    }

    if (result.status === 'duplicate') {
      return this.undoSuccess(
        envelope,
        restored.capturedState,
        result.stream.revision,
        result.intent.revision,
        target.intent.revision,
        actor.id,
      );
    }
    this.cached.set(game.id, {
      game,
      state: restored.capturedState,
      genesis: {
        genesisId: head.stream.genesisId,
        baseSaveId: head.stream.baseSaveId,
        stateHash: head.stream.stateHash,
      },
      revision: result.stream.revision,
    });
    return this.undoSuccess(
      envelope,
      restored.capturedState,
      result.stream.revision,
      result.intent.revision,
      target.intent.revision,
      actor.id,
    );
  }

  private undoFingerprint(request: UndoRequestV1): string {
    return sha256Hex(canonicalJson({
      gameId: request.gameId,
      actionId: request.actionId,
      baseRevision: request.baseRevision,
      engineVersion: request.engineVersion,
      kind: 'undo',
    }));
  }

  private undoSuccess(
    request: UndoRequestV1,
    state: ActionEngineState,
    revision: number,
    appliedRevision: number,
    undoneRevision: number,
    actorId: PlayerId,
  ): ActionUndoGatewayResult {
    const view = state.view(actorId);
    const promptToken = this.promptToken(state, actorId, revision + 1);
    const body: ActionUndoSuccessResponseV1 = {
      v: ACTION_SCHEMA_VERSION,
      actionId: request.actionId,
      status: 'undone',
      revision,
      appliedRevision,
      undoneRevision,
      engineVersion: this.engineVersion,
      viewRevision: revision,
      view,
      viewHash: viewHashOf(view),
      ...(promptToken === undefined ? {} : {promptToken}),
    };
    return {statusCode: STATUS.ok, body};
  }

  private promptToken(
    state: ActionEngineState,
    actorId: PlayerId,
    revision: number,
  ): string | undefined {
    const prompt = state.prompt(actorId);
    if (prompt === null) {
      return undefined;
    }
    return computePromptToken(this.promptTokenSecret, {
      gameId: state.gameId,
      actorId,
      revision,
      prompt,
    });
  }

  private successResult(
    status: 'applied' | 'duplicate',
    request: ActionRequestV1,
    revision: number,
    appliedRevision: number,
    view: PlayerViewModel,
    promptToken: string | undefined,
  ): ActionGatewayResult {
    const body: ActionSuccessResponseV1 = {
      v: ACTION_SCHEMA_VERSION,
      actionId: request.actionId,
      status,
      revision,
      appliedRevision,
      engineVersion: this.engineVersion,
      viewRevision: revision,
      view,
      viewHash: viewHashOf(view),
    };
    if (promptToken !== undefined) {
      body.promptToken = promptToken;
    }
    return {statusCode: STATUS.ok, body};
  }

  private storeRejection(err: unknown, currentRevision: number): ActionGatewayResult {
    if (err instanceof ActionIdConflictError) {
      return rejected(STATUS.conflict, 'IDEMPOTENCY_CONFLICT', {actionId: err.actionId});
    }
    if (err instanceof RevisionConflictError) {
      return rejected(STATUS.conflict, 'STALE_REVISION', {currentRevision: err.actualRevision, resync: 'full'});
    }
    if (err instanceof StaleEpochError ||
        err instanceof GenesisMismatchError ||
        err instanceof StreamNotFoundError ||
        err instanceof InvalidActionGenesisError) {
      return rejected(STATUS.conflict, 'STALE_REVISION', {currentRevision, resync: 'full'});
    }
    if (err instanceof InvalidActionIntentError) {
      return rejected(STATUS.internalServerError, 'PERSISTENCE_FAILURE', {retryable: false});
    }
    return rejected(STATUS.serviceUnavailable, 'PERSISTENCE_FAILURE', {retryable: true});
  }
}
