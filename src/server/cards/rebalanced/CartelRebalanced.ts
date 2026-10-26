import {Cartel} from '@/server/cards/base/Cartel';
import {CardName} from '@/common/cards/CardName';

export class CartelRebalanced extends Cartel {
  public override get name() {
    return CardName.CARTEL_REBALANCED;
  }
  public override get cost() {
    return 10;
  }
}
