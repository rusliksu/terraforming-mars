import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class SlashAndBurn extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SLASH_AND_BURN,
      tags: [Tag.PLANT],
      cost: 8,

      behavior: {
        production: {plants: -2, heat: 6},
      },

      metadata: {
        cardNumber: 'X53',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().plants(2).nbsp.plus().heat(6);
          });
        }),
        description: 'Decrease your plant production 2 steps. Increase your heat production 6 steps.',
      },
    });
  }
}
