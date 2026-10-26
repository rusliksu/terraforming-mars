import {IPlayer} from '../../IPlayer';
import {InequalityRequirement} from './InequalityRequirement';
import {RequirementType} from '../../../common/cards/RequirementType';

/**
 * Evaluate whether the number of distinct tag types a player has in play is at least
 * (or at most) a given value. Same underlying count as the Diversifier milestone.
 */
export class UniqueTagsRequirement extends InequalityRequirement {
  public readonly type = RequirementType.UNIQUE_TAGS;
  public getScore(player: IPlayer): number {
    return player.tags.distinctCount('milestone');
  }
}
