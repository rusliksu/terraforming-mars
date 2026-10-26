import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ColdLikeSteel extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.COLD_LIKE_STEEL,
      tags: [Tag.BUILDING],
      cost: 10,

      behavior: {
        production: {heat: -1, steel: 3},
      },

      metadata: {
        cardNumber: 'X45',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().heat(1).nbsp.plus().steel(3));
        }),
        description: 'Decrease your heat production 1 step. Increase your steel production 3 steps.',
      },
    });
  }
}
