import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ThreePlanetsSystem extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.THREE_PLANETS_SYSTEM,
      tags: [Tag.PLANT, Tag.VENUS, Tag.SPACE],
      cost: 19,
      victoryPoints: 1,

      requirements: {oxygen: 6},

      behavior: {
        global: {venus: 1},
        production: {plants: 1},
      },

      metadata: {
        cardNumber: 'Im114',
        renderData: CardRenderer.builder((b) => {
          b.venus(1).production((pb) => pb.plants(1));
        }),
        description: 'Requires at least 6% oxygen. Raise Venus 1 step and increase your plant production 1 step.',
      },
    });
  }
}
