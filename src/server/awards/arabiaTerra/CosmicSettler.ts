import {IAward} from '../IAward';
import {IPlayer} from '../../IPlayer';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';

export class CosmicSettler implements IAward {
  public readonly name = 'Cosmic Settler';
  public readonly description = 'Own the most cities not on Mars';
  public getScore(player: IPlayer): number {
    return player.game.board.getCitiesOffMars(player).length + VenusPhase2Expansion.getCitiesCount(player.game, player);
  }
}
