import {ACTION_SCHEMA_VERSION, ActionErrorCode, ActionErrorResponseV1, ActionSuccessResponseV1, ActionRequestV1, ActionResponseV1, MAX_ACTION_REQUEST_BYTES} from '../../common/actionProtocol/ActionProtocol';
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
import {EnginePromptSnapshot} from '../engine/EngineCanonical';
import {EngineInputError, UnsupportedEngineConfigError} from '../engine/EngineErrors';
import {IGame} from '../IGame';
import {IPlayer} from '../IPlayer';
import {InputError} from '../inputs/InputError';
import {ActionEnginePort, ActionEngineState} from './ActionEnginePort';
import {computePromptToken} from './PromptToken';
import {GenesisBinding, bindGenesis, viewHashOf} from './StateBinding';

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

const INTENT_TYPE = 'player.input.v2';

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

type CachedGameState = {
  game: IGame;
  state: ActionEngineState;
  genesis: GenesisBinding;
  /** Journal revision represented by `state`, or undefined when unknown. */
  revision: number | undefined;
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

function rejected(
  statusCode: number,
  code: ActionErrorCode,
  fields: Partial<ActionErrorResponseV1> = {},
): ActionGatewayResult {
  return {
    statusCode,
    body: {
      v: ACTION_SCHEMA_VERSION,
      status: 'rejected',
      code,
      ...fields,
    },
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

    let cached = this.cached.get(game.id);
    if (cached !== undefined && (cached.game !== game || cached.genesis.baseSaveId !== game.lastSaveId)) {
      // A reloaded or legacy-mutated live game cannot be trusted to contain the
      // cached candidate state. Rebuild the base state and fail closed on later
      // revisions until A5b recovery exists.
      this.cached.delete(game.id);
      cached = undefined;
    }
    if (cached === undefined) {
      const loaded = this.loadBaseState(game);
      if ('statusCode' in loaded) {
        return loaded;
      }
      cached = loaded;
      this.cached.set(game.id, cached);
    }

    try {
      await this.initialize();
    } catch (_err) {
      return rejected(STATUS.serviceUnavailable, 'PERSISTENCE_FAILURE', {retryable: true});
    }

    let stream: ActionStream | undefined;
    try {
      stream = await this.store.getStream(game.id);
    } catch (_err) {
      return rejected(STATUS.serviceUnavailable, 'PERSISTENCE_FAILURE', {retryable: true});
    }
    const headRevision = stream?.revision ?? 0;
    if (cached.revision === undefined && headRevision === 0) {
      cached.revision = 0;
    }

    let existing: ActionIntent | undefined;
    try {
      existing = await this.store.getIntent(game.id, envelope.actionId);
    } catch (_err) {
      return rejected(STATUS.serviceUnavailable, 'PERSISTENCE_FAILURE', {retryable: true});
    }
    if (existing !== undefined) {
      return this.duplicateResult(actor, envelope, cached, existing, headRevision);
    }

    const coherent = cached.revision === headRevision;
    const currentPromptToken = coherent ?
      this.promptToken(cached.state, actor.id, headRevision + 1) :
      undefined;
    if (!coherent) {
      return rejected(STATUS.conflict, 'STALE_REVISION', {
        currentRevision: headRevision,
        resync: 'full',
        ...(currentPromptToken === undefined ? {} : {currentPromptToken}),
      });
    }
    if (envelope.baseRevision !== headRevision) {
      return rejected(STATUS.conflict, 'STALE_REVISION', {
        currentRevision: headRevision,
        resync: 'full',
        ...(currentPromptToken === undefined ? {} : {currentPromptToken}),
      });
    }

    const prompt = cached.state.prompt(actor.id);
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

    if (this.legality !== undefined) {
      const decision = this.legality({game, actor, request: envelope});
      if (!decision.allowed) {
        return rejected(decision.statusCode ?? STATUS.unprocessableEntity, decision.code, {
          currentRevision: headRevision,
        });
      }
    }

    let candidate: ActionEngineState;
    try {
      candidate = this.engine.applyCandidate(cached.state, actor.id, envelope.input);
    } catch (err) {
      if (err instanceof InputError || err instanceof EngineInputError) {
        return rejected(STATUS.unprocessableEntity, 'INVALID_ACTION');
      }
      throw err;
    }
    if (candidate.gameId !== game.id) {
      throw new Error('Candidate engine changed the game id');
    }
    if (!this.liveStateMatches(game, cached)) {
      return rejected(STATUS.conflict, 'STALE_REVISION', {currentRevision: headRevision, resync: 'full'});
    }

    let appendStream = stream;
    if (appendStream === undefined) {
      try {
        appendStream = (await this.store.openStream({
          gameId: game.id,
          genesisId: cached.genesis.genesisId,
          baseSaveId: cached.genesis.baseSaveId,
          stateHash: cached.genesis.stateHash,
        })).stream;
      } catch (err) {
        return this.storeRejection(err, headRevision);
      }
      if (appendStream.revision !== headRevision) {
        return rejected(STATUS.conflict, 'STALE_REVISION', {currentRevision: appendStream.revision, resync: 'full'});
      }
    }

    const requestFingerprint = fingerprintOf(envelope);
    let result: AppendActionIntentResult;
    try {
      result = await this.store.appendIntent({
        gameId: game.id,
        expectedRevision: headRevision,
        genesisId: cached.genesis.genesisId,
        epoch: appendStream.epoch,
        actionId: envelope.actionId,
        actorId: actor.id,
        intentType: INTENT_TYPE,
        payload: {
          requestFingerprint,
          baseRevision: envelope.baseRevision,
          engineVersion: envelope.engineVersion,
          promptTokenHash: sha256Hex(envelope.promptToken),
          input: jsonValue(envelope.input),
        },
        prompt: promptMetadata(game.id, actor.id, headRevision + 1, prompt),
      });
    } catch (err) {
      return this.storeRejection(err, headRevision);
    }

    if (result.status === 'appended') {
      this.cached.set(game.id, {...cached, state: candidate, revision: result.stream.revision});
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
    // semantic payload is identical, so its candidate state is equivalent.
    if (result.intent.revision === result.stream.revision) {
      this.cached.set(game.id, {...cached, state: candidate, revision: result.stream.revision});
    }
    const current = this.cached.get(game.id);
    const responseState = current !== undefined && current.revision === result.stream.revision ?
      current.state :
      candidate;
    return this.successResult(
      'duplicate',
      envelope,
      result.stream.revision,
      result.intent.revision,
      responseState.view(actor.id),
      this.promptToken(responseState, actor.id, result.stream.revision + 1),
    );
  }

  private authorizedActor(game: IGame, userId: string): IPlayer | undefined {
    const matches = game.players.filter((player) => player.user !== undefined && player.user === userId);
    return matches.length === 1 ? matches[0] : undefined;
  }

  private liveStateMatches(game: IGame, cached: CachedGameState): boolean {
    return cached.game === game && cached.genesis.baseSaveId === game.lastSaveId;
  }

  private loadBaseState(game: IGame): CachedGameState | ActionGatewayResult {
    const snapshot = game.serialize();
    let state: ActionEngineState;
    try {
      state = this.engine.load(snapshot);
    } catch (err) {
      if (err instanceof UnsupportedEngineConfigError) {
        return rejected(STATUS.unprocessableEntity, 'INVALID_ACTION');
      }
      throw err;
    }
    return {
      game,
      state,
      genesis: bindGenesis(game.id, game.lastSaveId, snapshot),
      revision: undefined,
    };
  }

  private duplicateResult(
    actor: IPlayer,
    request: ActionRequestV1,
    cached: CachedGameState,
    existing: ActionIntent,
    headRevision: number,
  ): ActionGatewayResult {
    if (storedFingerprint(existing) !== fingerprintOf(request)) {
      return rejected(STATUS.conflict, 'IDEMPOTENCY_CONFLICT', {actionId: request.actionId});
    }
    const coherent = cached.revision === headRevision;
    if (!coherent) {
      // Without the cached candidate state there is no honest current view or
      // next prompt token. A5b recovery will replay the journal instead.
      return rejected(STATUS.conflict, 'STALE_REVISION', {
        currentRevision: headRevision,
        resync: 'full',
      });
    }
    return this.successResult(
      'duplicate',
      request,
      headRevision,
      existing.revision,
      cached.state.view(actor.id),
      this.promptToken(cached.state, actor.id, headRevision + 1),
    );
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
