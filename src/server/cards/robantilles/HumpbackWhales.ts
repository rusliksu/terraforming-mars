import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class HumpbackWhales extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.HUMPBACK_WHALES,
      tags: [Tag.ANIMAL],
      cost: 12,

      requirements: {oceans: 8},
      victoryPoints: 3,

      metadata: {
        cardNumber: 'H12',
        renderData: CardRenderer.builder((b) => {
          b.vpText('3 Victory Points.');
        }),
        description: 'Requires at least 8 oceans in play.',
      },
    });
  }
}
