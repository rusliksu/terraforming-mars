import {IPlayer} from '../../IPlayer';
import {IAward} from '../IAward';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';

export class Constructor implements IAward {
  public readonly name = 'Constructor';
  public readonly description = 'Have the most Colonies and Cities combined';

  public getScore(player: IPlayer): number {
    return player.getColoniesCount() + player.game.board.getCities(player).length + VenusPhase2Expansion.getCitiesCount(player.game, player);
  }
}
