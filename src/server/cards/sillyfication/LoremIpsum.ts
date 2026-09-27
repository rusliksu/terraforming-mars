import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';

export class LoremIpsum extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.LOREM_IPSUM,
      cost: 0,

      behavior: {
        drawCard: 1,
      },

      metadata: {
        cardNumber: 'X18',
        renderData: CardRenderer.builder((b) => {
          b.cards(1);
        }),
        description: 'Draw a card.',
      },
    });
  }
}
