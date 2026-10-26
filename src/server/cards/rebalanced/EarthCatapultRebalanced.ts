import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class EarthCatapultRebalanced extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.EARTH_CATAPULT_REBALANCED,
      tags: [Tag.EARTH],
      cost: 28,
      victoryPoints: 1,

      cardDiscount: {amount: 2},
      metadata: {
        cardNumber: '070',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a card, you pay 2 M€ less for it.', (eb) => {
            eb.empty().startEffect.megacredits(-2);
          });
        }),
      },
    });
  }
}
