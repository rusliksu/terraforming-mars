import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class Infrastructures extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.INFRASTRUCTURES,
      tags: [Tag.BUILDING],
      cost: 10,

      behavior: {
        production: {megacredits: 1, steel: 1},
      },

      metadata: {
        cardNumber: 'Im61',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1).steel(1));
        }),
        description: 'Increase your M€ production and your steel production 1 step.',
      },
    });
  }
}
