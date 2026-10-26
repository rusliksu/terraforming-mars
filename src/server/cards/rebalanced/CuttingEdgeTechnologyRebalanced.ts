import {CuttingEdgeTechnology} from '@/server/cards/promo/CuttingEdgeTechnology';
import {CardName} from '@/common/cards/CardName';

export class CuttingEdgeTechnologyRebalanced extends CuttingEdgeTechnology {
  public override get name() {
    return CardName.CUTTING_EDGE_TECHNOLOGY_REBALANCED;
  }
  public override get cost() {
    return 14;
  }
}
