import {IPlayer} from '../../IPlayer';
import {IAward} from '../IAward';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';

export class Metropolist implements IAward {
  public readonly name = 'Metropolist';
  public readonly description = 'Own the most cities';
  public getScore(player: IPlayer): number {
    return player.game.board.getCities(player).length + VenusPhase2Expansion.getCitiesCount(player.game, player);
  }
}
