import {BaseMilestone} from './IMilestone';
import {IPlayer} from '../IPlayer';
import {VenusPhase2Expansion} from '../venusPhase2/VenusPhase2Expansion';

export class Mayor extends BaseMilestone {
  constructor() {
    super(
      'Mayor',
      'Own 3 city tiles',
      3);
  }
  public getScore(player: IPlayer): number {
    return player.game.board.getCities(player).length + VenusPhase2Expansion.getCitiesCount(player.game, player);
  }
}
