import {CardName} from '@/common/cards/CardName';
import {SnowAlgae} from '@/server/cards/promo/SnowAlgae';

export class SnowAlgaeRebalanced extends SnowAlgae {
  public override get name() {
    return CardName.SNOW_ALGAE_REBALANCED;
  }

  public override get cost() {
    return 11;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      description: 'Requires 2 oceans. Increase your Plant production and your heat production 1 step each.',
    };
  }
}
