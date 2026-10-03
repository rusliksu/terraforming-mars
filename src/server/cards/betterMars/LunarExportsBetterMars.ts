import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {LunarExports} from '../colonies/LunarExports';

/** Lunar Exports, but the Earth tag is a Moon tag, and it's 1 M€ more expensive. */
export class LunarExportsBetterMars extends LunarExports {
  public override get name() {
    return CardName.LUNAR_EXPORTS_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.SPACE, Tag.MOON];
  }

  public override get cost() {
    return super.cost + 1;
  }

  public override get metadata() {
    return {...super.metadata, cardNumber: 'X56'};
  }
}
