import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {SelfSufficientSettlement} from '../prelude/SelfSufficientSettlement';

/** Self-Sufficient Settlement, with an additional Mars tag. */
export class SelfSufficientSettlementBetterMars extends SelfSufficientSettlement {
  public override get name() {
    return CardName.SELF_SUFFICIENT_SETTLEMENT_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.BUILDING, Tag.CITY, Tag.MARS];
  }

  public override get metadata() {
    return {...super.metadata, cardNumber: 'X59'};
  }
}
