import {BuildingIndustries} from '@/server/cards/base/BuildingIndustries';
import {CardName} from '@/common/cards/CardName';

export class BuildingIndustriesRebalanced extends BuildingIndustries {
  public override get name() {
    return CardName.BUILDING_INDUSTRIES_REBALANCED;
  }
  public override get cost() {
    return 5;
  }
}
