import * as responses from '../server/responses';
import prometheus from '@prometheus-io/client';
import {IPlayer} from '../IPlayer';
import {Server} from '../models/ServerModel';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {OrOptions} from '../inputs/OrOptions';
import {UndoActionOption} from '../inputs/UndoActionOption';
import {InputResponse, isOrOptionsResponse} from '../../common/inputs/InputResponse';
import {Request} from '../Request';
import {Response} from '../Response';
import * as fs from 'fs';
import * as path from 'path';
import {runId} from '../utils/server-ids';
import {AppError} from '../server/AppError';
import {InputError} from '../inputs/InputError';
import {isIProjectCard} from '../cards/IProjectCard';
import {INVALID_RUN_ID, STALE_PROMPT, UNDO_REVEALED_HIDDEN_INFORMATION, RESPONDING_TOO_QUICKLY} from '../../common/app/AppErrorId';
import {hasRevealedHiddenInformation} from '../game/hasRevealedHiddenInformation';
import {getUserAgent} from './auditRequest';
import type {AccessAuditEvent, AccessAuditRecordInput} from '../server/AccessAudit';
import {prepareActionReplayEntry, recordAcceptedActionReplayEntry} from '../game/ActionReplay';
import {HIDDEN_INFORMATION_UNDO_CONFIRMATION_REQUIRED} from '../../common/undo';
import {logIrreversibleUndo} from '../logs/logIrreversibleUndo';
import {BotTakeoverManager} from '../bot/BotTakeoverManager';
import {SURRENDER_CONFIRMATION_ANNOTATION} from '../surrender/SurrenderInput';
import {SurrenderError, surrenderPlayer} from '../surrender/SurrenderService';
import type {SurrenderBotManager} from '../surrender/SurrenderService';
import {capture} from '../server/SentryReporter';
import type {
  ErrorDiagnosticBoundary,
  ErrorDiagnosticContext,
} from '../server/SentryReporter';
import {RouteError} from './RouteError';
import {readBody} from './readBody';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import {stringToNumber} from '../database/utils';

type ShadowPromptSnapshot = {
  buttonLabel: string | null;
  title: string | null;
  type: string | null;
  decisionState?: PlayerViewModel;
};

type CaptureError = (error: unknown, context: ErrorDiagnosticContext) => void;

export const playerInputMetrics = {
  responseInterval: new prometheus.Histogram({
    name: 'player_input_response_interval',
    help: 'Time a user takes to respond to an input request',
    buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000, 300000],
    registers: [prometheus.register],
  }),
};

export class PlayerInput extends Handler {
  public static readonly INSTANCE = new PlayerInput();

  private readonly captureError: CaptureError;
  private readonly botTakeoverManager: SurrenderBotManager;
  private readonly minResponseIntervalMs: number;

  constructor(
    captureOrManager: CaptureError | SurrenderBotManager | number = capture,
    botTakeoverManager: SurrenderBotManager = BotTakeoverManager.INSTANCE,
  ) {
    super();
    if (typeof captureOrManager === 'number') {
      // Upstream constructs this handler with the minimum response interval.
      this.captureError = capture;
      this.botTakeoverManager = BotTakeoverManager.INSTANCE;
      this.minResponseIntervalMs = captureOrManager;
    } else if (typeof captureOrManager === 'function') {
      this.captureError = captureOrManager;
      this.botTakeoverManager = botTakeoverManager;
      this.minResponseIntervalMs = stringToNumber(process.env.MIN_RESPONSE_INTERVAL_MS, 0);
    } else {
      this.captureError = capture;
      this.botTakeoverManager = captureOrManager;
      this.minResponseIntervalMs = stringToNumber(process.env.MIN_RESPONSE_INTERVAL_MS, 0);
    }
  }
  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    const playerId = ctx.urlParams.playerId('id');

    ctx.ipTracker.addParticipant(playerId, ctx.ip);

    // This is the exact same code as in `ApiPlayer`. I bet it's not the only place.
    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      throw RouteError.notFound();
    }
    let player: IPlayer | undefined;
    try {
      player = game.getPlayerById(playerId);
    } catch (err) {
      console.warn(`unable to find player ${playerId}`, err);
      if (!(err instanceof AppError || err instanceof InputError)) {
        this.captureUnexpected(err, playerDiagnosticContext(
          'player-get', req.method, ctx.url.pathname, game.id, playerId,
        ));
      }
    }
    if (player === undefined) {
      responses.notFound(req, res);
      return;
    }
    recordPlayerInputAudit(req, ctx, player, 'player_input_attempt');
    if (game.surrenderedPlayerIds.has(player.id) && !this.hasServerIdAccess(ctx)) {
      recordPlayerInputAudit(req, ctx, player, 'player_input_rejected', {reason: 'surrendered_bot_control'});
      responses.badRequest(req, res, 'surrendered player is controlled by a bot');
      return;
    }
    return this.processInput(req, res, ctx, player);
  }

  private isWaitingForUndo(player: IPlayer, entity: InputResponse): boolean {
    const waitingFor = player.getWaitingFor();
    if (entity.type === 'or' && waitingFor instanceof OrOptions) {
      const idx = entity.index;
      return waitingFor.options[idx] instanceof UndoActionOption;
    }
    return false;
  }

  private isSurrenderConfirmation(player: IPlayer, entity: InputResponse): boolean {
    const waitingFor = player.getWaitingFor();
    return isOrOptionsResponse(entity) &&
      entity.index === 0 &&
      waitingFor instanceof OrOptions &&
      waitingFor.annotation === SURRENDER_CONFIRMATION_ANNOTATION;
  }

  private async performUndo(
    req: Request,
    _res: Response,
    ctx: Context,
    player: IPlayer,
    gameplayInput: InputResponse,
  ): Promise<IPlayer> {
    /**
     * The `lastSaveId` property is incremented during every `takeAction`.
     * The first save being decremented is the increment during `takeAction` call
     * The second save being decremented is the action that was taken
     */
    const lastSaveId = player.game.lastSaveId - 2;
    try {
      const currentGame = player.game;
      const restoredGame = await ctx.gameLoader.getGameAtOrBefore(player.game.id, lastSaveId);
      const crossedHiddenInformation = hasRevealedHiddenInformation(currentGame, restoredGame, player);
      if (crossedHiddenInformation &&
          ctx.url.searchParams.get('confirmHiddenInformation') !== 'true') {
        throw new AppError(UNDO_REVEALED_HIDDEN_INFORMATION, HIDDEN_INFORMATION_UNDO_CONFIRMATION_REQUIRED);
      }

      const game = await ctx.gameLoader.restoreGameAt(player.game.id, lastSaveId);
      if (game === undefined) {
        throw new InputError('Unable to perform undo operation. Error retrieving game from database. Please try again.');
      } else {
        if (crossedHiddenInformation) {
          logIrreversibleUndo(game, player.id);
        }
        // pull most recent player instance
        player = game.getPlayerById(player.id);
      }
    } catch (err) {
      if (err instanceof AppError || err instanceof InputError) {
        throw err;
      }
      console.error(err);
      this.captureUnexpected(err, playerDiagnosticContext(
        'player-undo', req.method, ctx.url.pathname, player.game.id, player.id, gameplayInput,
      ));
      throw new InputError('Unable to perform undo operation. Error retrieving game from database. Please try again.');
    }
    return player;
  }

  private async processInput(req: Request, res: Response, ctx: Context, player: IPlayer): Promise<void> {
    const responseInterval = this.responseInterval(player, ctx);
    const body = await readBody(req);
    let entityForLog: InputResponse | undefined;
    let isUndo = false;
    let promptSnapshot: ShadowPromptSnapshot = emptyPromptSnapshot();
    let promptInputSeq: number | null = null;
    let inputSeq: number | null = null;
    this.observeResponseInterval(responseInterval);
    try {
      if (this.isRespondingTooQuickly(responseInterval)) {
        throw new AppError(RESPONDING_TOO_QUICKLY, "You're responding a little too quickly.");
      }
      const entity = JSON.parse(body);
      entityForLog = cloneEntityForLog(entity);
      promptSnapshot = capturePromptSnapshot(player);
      promptInputSeq = player.game.shadowInputSeq ?? 0;
      validateInputContext(player, entity);

      // Placed here because it fits in a temporally cohesive sense.
      this.resetTableauCardState(player);

      isUndo = this.isWaitingForUndo(player, entity);
      const isSurrender = this.isSurrenderConfirmation(player, entity);
      if (isUndo) {
        player = await this.performUndo(req, res, ctx, player, entityForLog);
        inputSeq = advanceShadowInputSeq(player, promptInputSeq);
      } else {
        const previousSaveGamePromise = player.game.saveGamePromise;
        const stepUndoEnabled = player.game.gameOptions.undoStepOption === true;
        const replayEntry = stepUndoEnabled && !isSurrender ?
          prepareActionReplayEntry(player.game, player.id, entity) :
          undefined;
        if (!stepUndoEnabled && player.game.actionReplayState !== undefined) {
          player.game.actionReplayState = null;
        }
        try {
          if (isSurrender) {
            const surrenderResult = await surrenderPlayer({
              game: player.game,
              player,
              gameLoader: ctx.gameLoader,
              manager: this.botTakeoverManager,
              serverId: ctx.ids.serverId,
              advance: () => {
                if (player.game.actionReplayState !== undefined) {
                  player.game.actionReplayState = null;
                }
                inputSeq = advanceShadowInputSeq(player, promptInputSeq);
                player.process(entity);
              },
            });
            recordPlayerInputAudit(req, ctx, player, 'surrender_accepted', {
              authorization: 'player',
              botTakeover: surrenderResult.botTakeover,
            });
          } else {
            inputSeq = advanceShadowInputSeq(player, promptInputSeq);
            const wasSurrendered = player.game.surrenderedPlayerIds.has(player.id);
            player.process(entity);
            if (!wasSurrendered && player.game.surrenderedPlayerIds.has(player.id)) {
              recordPlayerInputAudit(req, ctx, player, 'surrender_accepted', {authorization: 'player'});
            }
          }
        } catch (err) {
          player.game.shadowInputSeq = promptInputSeq;
          inputSeq = null;
          if (isSurrender) {
            const restoredGame = await ctx.gameLoader.getGame(player.game.id);
            if (restoredGame !== undefined) {
              restoredGame.shadowInputSeq = promptInputSeq;
              player = restoredGame.getPlayerById(player.id);
            }
            recordPlayerInputAudit(req, ctx, player, 'surrender_rejected', {authorization: 'player'});
          }
          throw err;
        }
        const savedNewRoot = player.game.saveGamePromise !== previousSaveGamePromise;
        if (savedNewRoot) {
          await player.game.saveGamePromise;
        }
        if (replayEntry !== undefined) {
          recordAcceptedActionReplayEntry(player.game, replayEntry);
          if (savedNewRoot && player.game.actionReplayState !== undefined && player.game.actionReplayState !== null) {
            player.game.actionReplayState.resetBeforeNextInput = true;
          }
        }
      }
      appendShadowInputLog(player, entityForLog, body, promptSnapshot, promptInputSeq, inputSeq, isUndo, 'accepted');
      recordPlayerInputAudit(req, ctx, player, 'player_input_accepted', {
        inputType: typeof entityForLog?.type === 'string' ? entityForLog.type : null,
        isUndo,
      });
      responses.writeJson(res, ctx, Server.getPlayerModel(player));
    } catch (e) {
      appendShadowInputLog(player, entityForLog, body, promptSnapshot, promptInputSeq, inputSeq, isUndo, 'rejected', e);
      recordPlayerInputAudit(req, ctx, player, 'player_input_rejected', {
        inputType: typeof entityForLog?.type === 'string' ? entityForLog.type : null,
        isUndo,
        errorId: e instanceof AppError ? e.id : null,
      });
      if (!(e instanceof AppError || e instanceof InputError || e instanceof SurrenderError)) {
        console.warn('Error processing input from player', e);
        if (entityForLog !== undefined) {
          this.captureUnexpected(e, playerDiagnosticContext(
            'player-input', req.method, ctx.url.pathname, player.game.id, player.id, entityForLog,
          ));
        }
      }
      responses.badInputRequest(req, res, e);
    }
  }
  private captureUnexpected(error: unknown, context: ErrorDiagnosticContext): void {
    try {
      this.captureError(error, context);
    } catch (_captureError) {
      // Diagnostics must never change the existing player-input response path.
    }
  }

  // TODO(kberg): Find a better place for this optimization.
  private resetTableauCardState(player: IPlayer): void {
    for (const card of player.tableau) {
      card.clearWarnings();
      if (isIProjectCard(card)) {
        card.additionalProjectCosts = undefined;
      }
    }
  }

  private responseInterval(player: IPlayer, ctx: Context): number | undefined {
    if (player.inputRequestedAt === undefined) {
      return undefined;
    }
    return ctx.clock.now() - player.inputRequestedAt;
  }

  private observeResponseInterval(responseInterval: number | undefined): void {
    if (responseInterval !== undefined) {
      playerInputMetrics.responseInterval.observe(responseInterval);
    }
  }

  private isRespondingTooQuickly(responseInterval: number | undefined): boolean {
    if (this.minResponseIntervalMs <= 0) {
      return false;
    }
    if (responseInterval === undefined) {
      return false;
    }
    return responseInterval < this.minResponseIntervalMs;
  }
}

function playerDiagnosticContext(
  boundary: ErrorDiagnosticBoundary,
  method: string | undefined,
  pathname: string | undefined,
  gameId: string,
  playerId: string,
  gameplayInput?: unknown,
): ErrorDiagnosticContext {
  const context: ErrorDiagnosticContext = {boundary, gameId, playerId};
  const normalizedMethod = method?.trim().toUpperCase();
  if (normalizedMethod !== undefined && normalizedMethod.length > 0) {
    context.method = normalizedMethod;
  }
  if (pathname !== undefined && pathname.length > 0) {
    context.route = pathname;
  }
  if (gameplayInput !== undefined) {
    context.gameplayInput = gameplayInput;
  }
  return context;
}

function recordPlayerInputAudit(
  req: Request,
  ctx: Context,
  player: IPlayer,
  event: AccessAuditEvent,
  metadata?: Record<string, string | number | boolean | null>,
) {
  const record: AccessAuditRecordInput = {
    event,
    method: req.method ?? '',
    path: 'player/input',
    gameId: player.game.id,
    participantId: player.id,
    participantKind: 'player',
    clientIp: ctx.clientIp,
    userAgent: getUserAgent(req),
  };
  if (metadata !== undefined) {
    record.metadata = metadata;
  }
  ctx.accessAudit.record(record);
}

function appendShadowInputLog(
  player: IPlayer,
  entity: InputResponse | undefined,
  rawBody: string,
  promptSnapshot: ShadowPromptSnapshot,
  promptInputSeq: number | null,
  inputSeq: number | null,
  isUndo: boolean,
  result: 'accepted' | 'rejected',
  error?: unknown,
) {
  if (entity === undefined || process.env.SHADOW_LOG !== '1') {
    return;
  }
  try {
    const logDir = process.env.SHADOW_LOG_DIR || path.resolve(process.cwd(), 'shadow-logs');
    const filePrefix = process.env.SHADOW_LOG_FILE_PREFIX || 'input';
    fs.mkdirSync(logDir, {recursive: true});
    const logFile = path.join(logDir, `${filePrefix}-${player.game.id}.jsonl`);
    const entry = {
      schemaVersion: 'server-decision/v2',
      decisionState: promptSnapshot.decisionState,
      phaseAfter: player.game.phase,
      ts: new Date().toISOString(),
      source: 'player-input',
      result,
      serverRunId: runId ?? null,
      gameId: player.game.id,
      promptInputSeq,
      inputSeq,
      generation: player.game.generation,
      gameAge: player.game.gameAge,
      playerId: player.id,
      player: player.name,
      color: player.color,
      promptType: promptSnapshot.type,
      promptTitle: promptSnapshot.title,
      promptButtonLabel: promptSnapshot.buttonLabel,
      inputType: typeof entity.type === 'string' ? entity.type : null,
      isUndo,
      playerAction: entity,
      rawBody,
      mc: player.megaCredits,
      tr: player.terraformRating,
      errorId: error instanceof AppError ? error.id : undefined,
      errorMessage: error instanceof Error ? error.message : undefined,
    };
    const fd = fs.openSync(logFile, 'a', 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(entry) + '\n');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  } catch (e) {
    // Journal failure must be visible without exposing private input.
    console.error('shadow_input_journal_failed', e instanceof Error ? e.name : 'Error');
  }
}

function advanceShadowInputSeq(player: IPlayer, promptInputSeq: number | null): number {
  const base = Math.max(player.game.shadowInputSeq ?? 0, promptInputSeq ?? 0);
  const nextSeq = base + 1;
  player.game.shadowInputSeq = nextSeq;
  return nextSeq;
}

function capturePromptSnapshot(player: IPlayer): ShadowPromptSnapshot {
  const waitingFor = player.getWaitingFor();
  if (waitingFor === undefined || waitingFor === null) {
    return emptyPromptSnapshot();
  }
  const candidate = waitingFor as {buttonLabel?: unknown; title?: unknown; type?: unknown};
  const snapshot: ShadowPromptSnapshot = {
    buttonLabel: typeof candidate.buttonLabel === 'string' ? candidate.buttonLabel : null,
    title: extractPromptTitle(candidate.title),
    type: typeof candidate.type === 'string' ? candidate.type : null,
  };
  if (process.env.SHADOW_LOG === '1') {
    try {
      // Detach the actor's view before processing mutates cards and prompt options.
      snapshot.decisionState = JSON.parse(JSON.stringify(Server.getPlayerModel(player), (key, value) =>
        key === 'runId' || key === 'spectatorId' ? undefined : value));
    } catch (e) {
      console.error('shadow_input_snapshot_failed', e instanceof Error ? e.name : 'Error');
    }
  }
  return snapshot;
}

function cloneEntityForLog(entity: InputResponse): InputResponse {
  return JSON.parse(JSON.stringify(entity));
}

function emptyPromptSnapshot(): ShadowPromptSnapshot {
  return {buttonLabel: null, title: null, type: null};
}

function extractPromptTitle(title: unknown): string | null {
  if (typeof title === 'string') {
    return title;
  }
  if (title !== undefined && title !== null && typeof title === 'object') {
    const maybeMessage = (title as {message?: unknown}).message;
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }
  return null;
}

function validateInputContext(player: IPlayer, entity: any) {
  if (entity.runId !== undefined && runId !== undefined) {
    if (entity.runId !== runId) {
      throw new AppError(INVALID_RUN_ID, 'The server has restarted. Click OK to refresh this page.');
    }
  }
  // Clearing these out to stay compatible with the input response processors.
  delete entity.runId;
  const submittedPromptId = entity.promptId;
  delete entity.promptId;

  // External clients (bots) and older pages do not send the prompt identity yet.
  if (submittedPromptId === undefined) {
    return;
  }
  if (typeof submittedPromptId !== 'string' || submittedPromptId !== Server.getWaitingForPromptId(player)) {
    throw new AppError(
      STALE_PROMPT,
      'This game screen is out of date. Click OK to refresh it before choosing again.',
    );
  }
}
