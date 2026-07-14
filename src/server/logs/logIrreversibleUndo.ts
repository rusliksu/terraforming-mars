import {PlayerId} from '../../common/Types';
import {IGame} from '../IGame';

export function logIrreversibleUndo(game: IGame, playerId: PlayerId): void {
  const player = game.getPlayerById(playerId);
  game.log('${0} undid an irreversible action after revealing hidden information', (builder) => {
    builder.forIrreversibleUndo().player(player);
  });
}
