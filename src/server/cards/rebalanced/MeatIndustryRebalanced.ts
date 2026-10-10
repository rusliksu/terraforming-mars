import {MeatIndustry} from '@/server/cards/promo/MeatIndustry';
import {CardName} from '@/common/cards/CardName';

export class MeatIndustryRebalanced extends MeatIndustry {
  public override get name() {
    return CardName.MEAT_INDUSTRY_REBALANCED;
  }

  public override get cost() {
    return 10;
  }
}
