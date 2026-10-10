import {FuelFactory} from '@/server/cards/base/FuelFactory';
import {CardName} from '@/common/cards/CardName';

export class FuelFactoryRebalanced extends FuelFactory {
  public override get name() {
    return CardName.FUEL_FACTORY_REBALANCED;
  }

  public override get cost() {
    return 5;
  }
}
