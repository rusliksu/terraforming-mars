import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MoonMineralMetropolis extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MOON_MINERAL_METROPOLIS,
      tags: [Tag.CITY, Tag.MOON, Tag.SPACE],
      cost: 39,
      victoryPoints: 3,

      behavior: {
        production: {steel: 4},
        moon: {habitatTile: {}},
      },

      metadata: {
        cardNumber: 'H66',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.steel(4)).moonHabitat();
        }),
        description: 'Increase your steel production 4 steps. Place a city tile on The Moon (a habitat tile) and raise the habitat rate 1 step.',
      },
    });
  }
}
