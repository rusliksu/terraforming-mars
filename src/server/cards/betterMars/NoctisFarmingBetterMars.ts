import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {NoctisFarming} from '../base/NoctisFarming';

/** Noctis Farming, with an additional Mars tag. */
export class NoctisFarmingBetterMars extends NoctisFarming {
  public override get name() {
    return CardName.NOCTIS_FARMING_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.PLANT, Tag.BUILDING, Tag.MARS];
  }

  public override get metadata() {
    return {...super.metadata, cardNumber: 'X64'};
  }
}
