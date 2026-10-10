import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class MassConverterRebalanced extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MASS_CONVERTER_REBALANCED,
      tags: [Tag.SCIENCE, Tag.POWER],
      cost: 8,

      behavior: {
        production: {energy: 6},
      },

      requirements: {tag: Tag.SCIENCE, count: 6},
      cardDiscount: {tag: Tag.SPACE, amount: 2, per: 'card'},
      metadata: {
        cardNumber: '094',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a space card, you pay 2 M€ less for it.', (eb) => {
            eb.tag(Tag.SPACE).startEffect.megacredits(-2);
          }).br;
          b.production((pb) => pb.energy(6));
        }),
        description: 'Requires 6 science tags. Increase your energy production 6 steps.',
      },
    });
  }
}
