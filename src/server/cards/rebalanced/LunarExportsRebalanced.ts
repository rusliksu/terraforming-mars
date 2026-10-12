import {CardName} from '@/common/cards/CardName';
import {LunarExportsBetterMars} from '@/server/cards/betterMars/LunarExportsBetterMars';

export class LunarExportsRebalanced extends LunarExportsBetterMars {
  public override get name() {
    return CardName.LUNAR_EXPORTS_REBALANCED;
  }
}
