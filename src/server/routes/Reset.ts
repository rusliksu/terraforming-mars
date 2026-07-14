import * as responses from '../server/responses';
import {Server} from '../models/ServerModel';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {IPlayer} from '../IPlayer';
import {isPlayerId} from '../../common/Types';
import {Request} from '../Request';
import {Response} from '../Response';
import {appendCanceledLogMessages} from '../logs/appendCanceledLogMessages';
import {hasRevealedHiddenInformation} from '../game/hasRevealedHiddenInformation';
import {ActionReplayMismatch, stepBackActionInput} from '../game/ActionReplay';
import {HIDDEN_INFORMATION_UNDO_CONFIRMATION_REQUIRED} from '../../common/undo';
import {AppErrorResponse, UNDO_REVEALED_HIDDEN_INFORMATION} from '../../common/app/AppErrorId';
import {statusCode} from '../../common/http/statusCode';
import {logIrreversibleUndo} from '../logs/logIrreversibleUndo';

/**
 * Reloads the game from the last action.
 *
 * This may only be called by the active player. It reloads the game.
 * Now, given the current save behavior. The game isn't saved after every action.
 * I think it's saved after every action when undo is on. So, there's that.
 * But I forget when the game is saved in solo. Probably all will be well.
 *
 * Crossing a hidden-information boundary requires explicit confirmation.
 */
export class Reset extends Handler {
  public static readonly INSTANCE = new Reset();
  private constructor() {
    super();
  }

  public override async get(req: Request, res: Response, ctx: Context): Promise<void> {
    const playerId = ctx.url.searchParams.get('id');
    if (playerId === null) {
      responses.badRequest(req, res, 'missing id parameter');
      return;
    }

    if (!isPlayerId(playerId)) {
      responses.badRequest(req, res, 'invalid player id');
      return;
    }

    // This is the exact same code as in `ApiPlayer`. I bet it's not the only place.
    const game = await ctx.gameLoader.getGame(playerId);
    if (game === undefined) {
      responses.notFound(req, res);
      return;
    }

    const stepMode = ctx.url.searchParams.get('mode') === 'step';
    const undoEnabled = stepMode ?
      game.gameOptions.undoStepOption === true :
      game.players.length === 1 || game.gameOptions.undoOption === true;
    if (!undoEnabled) {
      responses.badRequest(
        req,
        res,
        stepMode ? 'Undo one step requires the experimental game option to be enabled' : 'Cancel action requires undo to be enabled',
      );
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
    if (player.game.activePlayer.id !== player.id) {
      responses.badRequest(req, res, 'Not the active player');
      return;
    }

    if (stepMode) {
      try {
        const currentGame = player.game;
        const stepBackResult = stepBackActionInput(currentGame, player.id);
        const replayedGame = stepBackResult.game;
        const crossedHiddenInformation = hasRevealedHiddenInformation(
          currentGame,
          replayedGame,
          player,
          {restoredPromptCardsAreKnown: true},
        );
        if (crossedHiddenInformation &&
            ctx.url.searchParams.get('confirmHiddenInformation') !== 'true') {
          writeHiddenInformationWarning(res);
          return;
        }
        appendCanceledLogMessages(currentGame, replayedGame, stepBackResult.canceledLogStartIndex);
        if (crossedHiddenInformation) {
          logIrreversibleUndo(replayedGame, player.id);
        }
        replayedGame.undoCount = Math.max(replayedGame.undoCount, currentGame.undoCount) + 1;
        await ctx.gameLoader.add(replayedGame);
        responses.writeJson(res, ctx, Server.getPlayerModel(replayedGame.getPlayerById(player.id)));
        return;
      } catch (error) {
        if (!(error instanceof ActionReplayMismatch)) {
          console.error(error);
        }
        responses.badRequest(req, res, error instanceof Error ? error.message : 'Could not step back');
        return;
      }
    }

    try {
      const currentGame = player.game;
      const reloadedGame = await ctx.gameLoader.getGame(currentGame.id, /** force reload */ true);
      if (reloadedGame !== undefined) {
        const crossedHiddenInformation = hasRevealedHiddenInformation(currentGame, reloadedGame, player);
        if (crossedHiddenInformation &&
            ctx.url.searchParams.get('confirmHiddenInformation') !== 'true') {
          await ctx.gameLoader.add(currentGame);
          writeHiddenInformationWarning(res);
          return;
        }

        appendCanceledLogMessages(currentGame, reloadedGame);
        if (crossedHiddenInformation) {
          logIrreversibleUndo(reloadedGame, player.id);
        }
        const reloadedPlayer = reloadedGame.getPlayerById(player.id);
        reloadedGame.inputsThisRound = 0;
        reloadedGame.undoCount = Math.max(reloadedGame.undoCount, currentGame.undoCount) + 1;
        responses.writeJson(res, ctx, Server.getPlayerModel(reloadedPlayer));
        return;
      }
    } catch (err) {
      console.error(err);
    }
    responses.badRequest(req, res, 'Could not reset');
  }
}

function writeHiddenInformationWarning(res: Response): void {
  const response: AppErrorResponse = {
    id: UNDO_REVEALED_HIDDEN_INFORMATION,
    message: HIDDEN_INFORMATION_UNDO_CONFIRMATION_REQUIRED,
  };
  res.writeHead(statusCode.badRequest, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(response));
}
