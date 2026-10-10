import {CardName} from '@/common/cards/CardName';
import {Zeppelins} from '@/server/cards/base/Zeppelins';

export class ZeppelinsRebalanced extends Zeppelins {
  public override get name() {
    return CardName.ZEPPELINS_REBALANCED;
  }

  public override get cost() {
    return 11;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      description: 'Requires 5% oxygen. Increase your M€ production 1 step for each City tile ON MARS.',
    };
  }
}
