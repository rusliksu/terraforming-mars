import {MartianRails} from '@/server/cards/base/MartianRails';
import {CardName} from '@/common/cards/CardName';

export class MartianRailsRebalanced extends MartianRails {
  public override get name() {
    return CardName.MARTIAN_RAILS_REBALANCED;
  }

  public override get cost() {
    return 12;
  }
}
