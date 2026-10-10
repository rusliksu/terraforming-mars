import {MicroMills} from '@/server/cards/base/MicroMills';
import {CardName} from '@/common/cards/CardName';

export class MicroMillsRebalanced extends MicroMills {
  public override get name() {
    return CardName.MICRO_MILLS_REBALANCED;
  }

  public override get cost() {
    return 2;
  }
}
