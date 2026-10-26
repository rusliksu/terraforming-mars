import {IPlayer} from '../IPlayer';
import {PlayerInput} from '../PlayerInput';
import {PlayerInputModel} from '../../common/models/PlayerInputModel';
import {Phase} from '../../common/Phase';
import {TileType} from '../../common/TileType';

/** Recognizes the complete native Player.takeActionForFinalGreenery root, never arbitrary space captions. */
export function projectFinalGreenery(player: IPlayer, input: PlayerInput, model: PlayerInputModel): PlayerInputModel {
  if (player.getWaitingFor() !== input || player.game.phase !== Phase.PRODUCTION || model.type !== 'or' ||
      model.title !== 'Place any final greenery from plants' || model.options.length !== 2) {
    return model;
  }
  const [placement, skip] = model.options;
  if (placement.type !== 'space' || placement.title !== 'Select space for greenery tile' ||
      skip.type !== 'option' || skip.title !== "Don't place a greenery") {
    return model;
  }
  return {...model, options: [{...placement, tileType: TileType.GREENERY, finalGreenery: true}, skip]};
}
