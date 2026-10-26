import {ForcedPrecipitation} from '@/server/cards/venusNext/ForcedPrecipitation';
import {CardName} from '@/common/cards/CardName';

export class ForcedPrecipitationRebalanced extends ForcedPrecipitation {
  public override get name() {
    return CardName.FORCED_PRECIPITATION_REBALANCED;
  }

  public override get cost() {
    return 4;
  }
}
