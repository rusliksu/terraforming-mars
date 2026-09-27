import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class Cacti extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.CACTI,
      tags: [Tag.PLANT],
      cost: 3,

      requirements: {temperature: 8},

      behavior: {
        production: {plants: 1},
      },

      metadata: {
        cardNumber: 'H09',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(1));
        }),
        description: 'Requires a temperature of at least +8 C. Increase your Plant production 1 step.',
      },
    });
  }
}
