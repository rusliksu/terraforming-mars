import * as responses from '../server/responses';
import {IPlayer} from '../IPlayer';
import {Server} from '../models/ServerModel';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {OrOptions} from '../inputs/OrOptions';
import {UndoActionOption} from '../inputs/UndoActionOption';
import {InputResponse} from '../../common/inputs/InputResponse';
import {isPlayerId} from '../../common/Types';
import {Request} from '../Request';
import {Response} from '../Response';
import * as fs from 'fs';
import * as path from 'path';
import {runId} from '../utils/server-ids';
import {AppError} from '../server/AppError';
import {statusCode} from '../../common/http/statusCode';
import {InputError} from '../inputs/InputError';
import {isIProjectCard} from '../cards/IProjectCard';
import {AppErrorResponse, INVALID_RUN_ID} from '../../common/app/AppErrorId';

type ShadowPromptSnapshot = {
  buttonLabel: string | null;
  title: string | null;
  type: string | null;
};

export class PlayerInput extends Handler {
  public static readonly INSTANCE = new PlayerInput();

  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    const playerId = ctx.url.searchParams.get('id');
    if (playerId === null) {
      responses.badRequest(req, res, 'missing id parameter');
      return;
    }

    if (!isPlayerId(playerId)) {
      responses.badRequest(req, res, 'invalid player id');
      return;
    }

    ctx.ipTracker.addParticipant(playerId, ctx.ip);

    // This is the exact same code as in `ApiPlayer`. I bet it's not the only place.
    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      responses.notFound(req, res);
      return;
    }
    let player: IPlayer | undefined;
    try {
      player = game.getPlayerById(playerId);
    } catch (err) {
      console.warn(`unable to find player ${playerId}`, err);
    }
    if (player === undefined) {
      responses.notFound(req, res);
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

  private async performUndo(_req: Request, _res: Response, ctx: Context, player: IPlayer): Promise<IPlayer> {
    /**
     * The `lastSaveId` property is incremented during every `takeAction`.
     * The first save being decremented is the increment during `takeAction` call
     * The second save being decremented is the action that was taken
     */
    const lastSaveId = player.game.lastSaveId - 2;
    try {
      const game = await ctx.gameLoader.restoreGameAt(player.game.id, lastSaveId);
      if (game === undefined) {
        player.game.log('Unable to perform undo operation. Error retrieving game from database. Please try again.', () => {}, {reservedFor: player});
      } else {
        // pull most recent player instance
        player = game.getPlayerById(player.id);
      }
    } catch (err) {
      console.error(err);
    }
    return player;
  }

  private processInput(req: Request, res: Response, ctx: Context, player: IPlayer): Promise<void> {
    // TODO(kberg): Find a better place for this optimization.
    for (const card of player.tableau) {
      card.warnings.clear();
      if (isIProjectCard(card)) {
        card.additionalProjectCosts = undefined;
      }
    }
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (data) => {
        body += data.toString();
      });
      req.once('end', async () => {
        let entityForLog: InputResponse | undefined;
        let isUndo = false;
        let promptSnapshot: ShadowPromptSnapshot = emptyPromptSnapshot();
        let promptInputSeq: number | null = null;
        let inputSeq: number | null = null;
        try {
          const entity = JSON.parse(body);
          entityForLog = cloneEntityForLog(entity);
          promptSnapshot = capturePromptSnapshot(player.getWaitingFor());
          promptInputSeq = player.game.shadowInputSeq ?? 0;
          validateRunId(entity);
          isUndo = this.isWaitingForUndo(player, entity);
          if (isUndo) {
            player = await this.performUndo(req, res, ctx, player);
            inputSeq = advanceShadowInputSeq(player, promptInputSeq);
            responses.writeJson(res, ctx, Server.getPlayerModel(player));
          } else {
            // Shadow log: record what player was asked and what they chose
            try {
              const wf = player.getWaitingFor();
              if (wf && process.env.SHADOW_LOG !== '0') {
                const logDir = process.env.SHADOW_LOG_DIR || path.resolve(process.cwd(), 'shadow-logs');
                fs.mkdirSync(logDir, {recursive: true});
                const logFile = path.join(logDir, `shadow-${player.game.id}.jsonl`);
                const entry = {
                  ts: new Date().toISOString(),
                  gameId: player.game.id,
                  gen: player.game.generation,
                  player: player.name,
                  color: player.color,
                  promptType: (wf as any).type || '',
                  title: typeof (wf as any).title === 'string' ? (wf as any).title : ((wf as any).title?.message || ''),
                  playerAction: entity,
                  mc: (player as any).megaCredits ?? 0,
                  tr: player.getTerraformRating(),
                };
                fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
              }
            } catch(_e) { /* shadow log error — don't block game */ }
            inputSeq = advanceShadowInputSeq(player, promptInputSeq);
            const previousSaveGamePromise = player.game.saveGamePromise;
            try {
              player.process(entity);
            } catch (err) {
              player.game.shadowInputSeq = promptInputSeq;
              inputSeq = null;
              throw err;
            }
            if (player.game.saveGamePromise !== previousSaveGamePromise) {
              await player.game.saveGamePromise;
            }
            responses.writeJson(res, ctx, Server.getPlayerModel(player));
          }
          appendShadowInputLog(player, entityForLog, body, promptSnapshot, promptInputSeq, inputSeq, isUndo, 'accepted');
          resolve();
        } catch (e) {
          appendShadowInputLog(player, entityForLog, body, promptSnapshot, promptInputSeq, inputSeq, isUndo, 'rejected', e);
          if (!(e instanceof AppError || e instanceof InputError)) {
            console.warn('Error processing input from player', e);
          }
          // TODO(kberg): use responses.ts, though that changes the output.
          res.writeHead(statusCode.badRequest, {
            'Content-Type': 'application/json',
          });

          const id = e instanceof AppError ? e.id : undefined;
          const message = e instanceof Error ? e.message : String(e);
          const response: AppErrorResponse = {
            id: id,
            message: message,
          };
          res.write(JSON.stringify(response));
          res.end();
          resolve();
        }
      });
    });
  }
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
      mc: (player as any).megaCredits ?? 0,
      tr: player.getTerraformRating(),
      errorId: error instanceof AppError ? error.id : undefined,
      errorMessage: error instanceof Error ? error.message : undefined,
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (_e) {
    // Logging is best-effort and must never block gameplay.
  }
}

function advanceShadowInputSeq(player: IPlayer, promptInputSeq: number | null): number {
  const base = Math.max(player.game.shadowInputSeq ?? 0, promptInputSeq ?? 0);
  const nextSeq = base + 1;
  player.game.shadowInputSeq = nextSeq;
  return nextSeq;
}

function capturePromptSnapshot(waitingFor: unknown): ShadowPromptSnapshot {
  if (waitingFor === undefined || waitingFor === null) {
    return emptyPromptSnapshot();
  }
  const candidate = waitingFor as {buttonLabel?: unknown; title?: unknown; type?: unknown};
  return {
    buttonLabel: typeof candidate.buttonLabel === 'string' ? candidate.buttonLabel : null,
    title: extractPromptTitle(candidate.title),
    type: typeof candidate.type === 'string' ? candidate.type : null,
  };
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

function validateRunId(entity: any) {
  if (entity.runId !== undefined && runId !== undefined) {
    if (entity.runId !== runId) {
      throw new AppError(INVALID_RUN_ID, 'The server has restarted. Click OK to refresh this page.');
    }
  }
  // Clearing this out to be compatible with the input response processors.
  delete entity.runId;
}
