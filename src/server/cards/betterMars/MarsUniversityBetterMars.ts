import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {MarsUniversity} from '../base/MarsUniversity';

/** Mars University, with an additional Mars tag and 2 M€ more expensive. */
export class MarsUniversityBetterMars extends MarsUniversity {
  public override get name() {
    return CardName.MARS_UNIVERSITY_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.SCIENCE, Tag.BUILDING, Tag.MARS];
  }

  public override get cost() {
    return super.cost + 2;
  }

  public override get metadata() {
    return {...super.metadata, cardNumber: 'X66'};
  }
}
