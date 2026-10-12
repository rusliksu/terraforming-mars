import {CardName} from '@/common/cards/CardName';
import {LunarMiningBetterMars} from '@/server/cards/betterMars/LunarMiningBetterMars';

export class LunarMiningRebalanced extends LunarMiningBetterMars {
  public override get name() {
    return CardName.LUNAR_MINING_REBALANCED;
  }
}
