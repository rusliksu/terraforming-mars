import {IPlayer} from '../../IPlayer';
import {InequalityRequirement} from './InequalityRequirement';
import {RequirementType} from '../../../common/cards/RequirementType';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';

/**
 * Evaluate whether the number of city tiles in play (Mars, plus Venus Phase 2's Cloud City tiles)
 * is at least (or at most) a given value.
 *
 * Can apply to a single player's tiles or all tiles.
 */
export class CitiesRequirement extends InequalityRequirement {
  public readonly type = RequirementType.CITIES;
  public override getScore(player: IPlayer): number {
    const target = this.all ? undefined : player;
    return player.game.board.getCities(target).length + VenusPhase2Expansion.getCitiesCount(player.game, target);
  }
}
