import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {CardRequirement} from './CardRequirement';
import {RequirementType} from '../../../common/cards/RequirementType';

/**
 * High Orbit (fan): every "Silver" card requires the player to have more of one tag than
 * another -- specifically, more Space tags than Infrastructure tags. Unlike TagCardRequirement
 * (a tag count against a fixed number), this compares two tag counts against each other.
 */
export class RelativeTagRequirement extends CardRequirement {
  public readonly type = RequirementType.RELATIVE_TAG;
  constructor(public readonly greater: Tag, public readonly lesser: Tag) {
    super();
  }

  public satisfies(player: IPlayer): boolean {
    return player.tags.count(this.greater) > player.tags.count(this.lesser);
  }
}
