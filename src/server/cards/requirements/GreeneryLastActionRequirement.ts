import {IPlayer} from '../../IPlayer';
import {CardRequirement} from './CardRequirement';
import {RequirementType} from '../../../common/cards/RequirementType';

/**
 * Evaluate whether the player's last action this game was placing a greenery tile.
 */
export class GreeneryLastActionRequirement extends CardRequirement {
  public readonly type = RequirementType.GREENERY_LAST_ACTION;
  public satisfies(player: IPlayer): boolean {
    return player.lastGreeneryActionNumber !== undefined && player.lastGreeneryActionNumber === player.actionsTakenThisGame;
  }
}
