import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {EarlySettlement} from '../prelude/EarlySettlement';

/** Early Settlement, with an additional Mars tag. */
export class EarlySettlementBetterMars extends EarlySettlement {
  public override get name() {
    return CardName.EARLY_SETTLEMENT_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.BUILDING, Tag.CITY, Tag.MARS];
  }

  public override get metadata() {
    return {...super.metadata, cardNumber: 'X58'};
  }
}
