import {AdaptedLichen} from '@/server/cards/base/AdaptedLichen';
import {CardName} from '@/common/cards/CardName';

export class AdaptedLichenRebalanced extends AdaptedLichen {
  public override get name() {
    return CardName.ADAPTED_LICHEN_REBALANCED;
  }
  public override get cost() {
    return 8;
  }
}
