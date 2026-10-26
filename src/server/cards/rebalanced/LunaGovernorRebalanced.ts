import {CardName} from '@/common/cards/CardName';
import {LunaGovernorBetterMars} from '@/server/cards/betterMars/LunaGovernorBetterMars';

export class LunaGovernorRebalanced extends LunaGovernorBetterMars {
  public override get name() {
    return CardName.LUNA_GOVERNOR_REBALANCED;
  }
}
