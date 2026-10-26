import {CardName} from '@/common/cards/CardName';
import {TopsoilContract} from '@/server/cards/promo/TopsoilContract';

export class TopsoilContractRebalanced extends TopsoilContract {
  public override get name() {
    return CardName.TOPSOIL_CONTRACT_REBALANCED;
  }

  public override get cost() {
    return 10;
  }
}
