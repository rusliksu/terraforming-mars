import {CardName} from '@/common/cards/CardName';
import {MeatIndustryBetterMars} from '@/server/cards/betterMars/MeatIndustryBetterMars';

export class MeatIndustryRebalanced extends MeatIndustryBetterMars {
  public override get name() {
    return CardName.MEAT_INDUSTRY_REBALANCED;
  }
}
