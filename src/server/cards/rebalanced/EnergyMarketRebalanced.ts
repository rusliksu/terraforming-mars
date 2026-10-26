import {EnergyMarket} from '@/server/cards/promo/EnergyMarket';
import {CardName} from '@/common/cards/CardName';

export class EnergyMarketRebalanced extends EnergyMarket {
  public override get name() {
    return CardName.ENERGY_MARKET_REBALANCED;
  }
  public override get cost() {
    return 5;
  }
}
