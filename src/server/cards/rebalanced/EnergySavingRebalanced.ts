import {EnergySaving} from '@/server/cards/base/EnergySaving';
import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';

export class EnergySavingRebalanced extends EnergySaving {
  public override get name() {
    return CardName.ENERGY_SAVING_REBALANCED;
  }
  public override get cost() {
    return 15;
  }
  public override get tags() {
    return [Tag.POWER, Tag.BUILDING];
  }
}
