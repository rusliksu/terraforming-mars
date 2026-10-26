import {CardName} from '@/common/cards/CardName';
import {LunarBeamBetterMars} from '@/server/cards/betterMars/LunarBeamBetterMars';

export class LunarBeamRebalanced extends LunarBeamBetterMars {
  public override get name() {
    return CardName.LUNAR_BEAM_REBALANCED;
  }
}
