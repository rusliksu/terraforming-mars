import {CardName} from '@/common/cards/CardName';
import {TropicalResort} from '@/server/cards/base/TropicalResort';

export class TropicalResortRebalanced extends TropicalResort {
  public override get name() {
    return CardName.TROPICAL_RESORT_REBALANCED;
  }

  public override get cost() {
    return 11;
  }
}
