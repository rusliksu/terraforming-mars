import {CardName} from '@/common/cards/CardName';
import {LunaMetropolisBetterMars} from '@/server/cards/betterMars/LunaMetropolisBetterMars';

export class LunaMetropolisRebalanced extends LunaMetropolisBetterMars {
  public override get name() {
    return CardName.LUNA_METROPOLIS_REBALANCED;
  }
}
