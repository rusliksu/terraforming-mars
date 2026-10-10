import {Insects} from '@/server/cards/base/Insects';
import {CardName} from '@/common/cards/CardName';

export class InsectsRebalanced extends Insects {
  public override get name() {
    return CardName.INSECTS_REBALANCED;
  }

  public override get cost() {
    return 11;
  }
}
