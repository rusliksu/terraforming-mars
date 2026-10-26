import {ReleaseOfInertGases} from '@/server/cards/base/ReleaseOfInertGases';
import {CardName} from '@/common/cards/CardName';

export class ReleaseOfInertGasesRebalanced extends ReleaseOfInertGases {
  public override get name() {
    return CardName.RELEASE_OF_INERT_GASES_REBALANCED;
  }

  public override get cost() {
    return 13;
  }
}
