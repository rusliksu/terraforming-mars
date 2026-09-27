import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {LunarBeam} from '../base/LunarBeam';

/** Lunar Beam, but the Earth tag is a Moon tag. */
export class LunarBeamBetterMars extends LunarBeam {
  public override get name() {
    return CardName.LUNAR_BEAM_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.MOON, Tag.POWER];
  }

  public override get metadata() {
    return {...super.metadata, cardNumber: 'X54'};
  }
}
