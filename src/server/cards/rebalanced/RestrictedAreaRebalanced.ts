import {CardName} from '@/common/cards/CardName';
import {RestrictedArea} from '@/server/cards/base/RestrictedArea';

export class RestrictedAreaRebalanced extends RestrictedArea {
  constructor() {
    super(CardName.RESTRICTED_AREA_REBALANCED);
  }

  public override get cost() {
    return 13;
  }
}
