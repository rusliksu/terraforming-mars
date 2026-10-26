import {CardName} from '@/common/cards/CardName';
import {SolarPower} from '@/server/cards/base/SolarPower';

export class SolarPowerRebalanced extends SolarPower {
  public override get name() {
    return CardName.SOLAR_POWER_REBALANCED;
  }

  public override get cost() {
    return 10;
  }
}
