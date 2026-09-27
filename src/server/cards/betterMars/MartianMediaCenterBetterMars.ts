import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {MartianMediaCenter} from '../turmoil/MartianMediaCenter';

/** Martian Media Center, with an additional Mars tag. */
export class MartianMediaCenterBetterMars extends MartianMediaCenter {
  public override get name() {
    return CardName.MARTIAN_MEDIA_CENTER_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.BUILDING, Tag.MARS];
  }

  public override get metadata() {
    return {...super.metadata, cardNumber: 'X69'};
  }
}
