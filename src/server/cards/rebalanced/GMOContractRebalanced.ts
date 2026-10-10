import {GMOContract} from '@/server/cards/turmoil/GMOContract';
import {CardName} from '@/common/cards/CardName';

export class GMOContractRebalanced extends GMOContract {
  public override get name() {
    return CardName.GMO_CONTRACT_REBALANCED;
  }

  public override get cost() {
    return 8;
  }
}
