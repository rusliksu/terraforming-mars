import {DesignedMicroOrganisms} from '@/server/cards/base/DesignedMicroOrganisms';
import {CardName} from '@/common/cards/CardName';

export class DesignedMicroOrganismsRebalanced extends DesignedMicroOrganisms {
  public override get name() {
    return CardName.DESIGNED_MICRO_ORGANISMS_REBALANCED;
  }
  public override get cost() {
    return 15;
  }
}
