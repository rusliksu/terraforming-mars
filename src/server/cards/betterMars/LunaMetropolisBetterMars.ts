import {Tag} from '../../../common/cards/Tag';
import {SpaceName} from '../../../common/boards/SpaceName';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {LunaMetropolis} from '../venusNext/LunaMetropolis';

/** Luna Metropolis, but the Earth tag (and the tag it counts) is the Moon tag. */
export class LunaMetropolisBetterMars extends LunaMetropolis {
  public override get name() {
    return CardName.LUNA_METROPOLIS_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.CITY, Tag.SPACE, Tag.MOON];
  }

  public override get behavior() {
    return {
      production: {megacredits: {tag: Tag.MOON}},
      city: {space: SpaceName.LUNA_METROPOLIS},
    };
  }

  public override get metadata() {
    return {
      ...super.metadata,
      cardNumber: 'X55',
      renderData: CardRenderer.builder((b) => {
        b.production((pb) => pb.megacredits(1).slash().tag(Tag.MOON)).br;
        b.city().asterix();
      }),
      description: 'Increase your M€ production 1 step for each Moon tag you have, including this. Place a city tile on the RESERVED AREA.',
    };
  }
}
