import {IGame} from '../IGame';
import {IPlayer} from '../IPlayer';

export const HIDDEN_INFORMATION_UNDO_CONFIRMATION_MESSAGE =
  'This action revealed hidden information. Undoing it will be recorded in the game log. Continue?';

export async function recordHiddenInformationUndo(
  game: IGame,
  player: IPlayer,
  saveGame: (game: IGame) => Promise<void>,
): Promise<void> {
  game.log('${0} undid an action after hidden information was revealed', (b) => b.forWarning().player(player));
  try {
    await saveGame(game);
  } catch (err) {
    // The restore has already happened. Do not report it as failed and risk a second, deeper undo.
    console.error('Unable to persist hidden-information undo audit log', err);
  }
}
