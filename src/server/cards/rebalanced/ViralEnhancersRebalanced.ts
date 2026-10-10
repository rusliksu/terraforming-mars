import {CardName} from '@/common/cards/CardName';
import {ViralEnhancers} from '@/server/cards/base/ViralEnhancers';

export class ViralEnhancersRebalanced extends ViralEnhancers {
  public override get name() {
    return CardName.VIRAL_ENHANCERS_REBALANCED;
  }

  public override get cost() {
    return 10;
  }
}
