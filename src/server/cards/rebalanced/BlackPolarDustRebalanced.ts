import {BlackPolarDust} from '@/server/cards/base/BlackPolarDust';
import {CardName} from '@/common/cards/CardName';

export class BlackPolarDustRebalanced extends BlackPolarDust {
  public override get name() {
    return CardName.BLACK_POLAR_DUST_REBALANCED;
  }
  public override get cost() {
    return 14;
  }
}
