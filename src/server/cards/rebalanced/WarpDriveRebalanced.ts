import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Card} from '@/server/cards/Card';

export class WarpDriveRebalanced extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 16,
      tags: [Tag.SCIENCE],
      name: CardName.WARP_DRIVE_REBALANCED,
      type: CardType.ACTIVE,
      victoryPoints: 2,

      requirements: {tag: Tag.SCIENCE, count: 5},
      cardDiscount: {tag: Tag.SPACE, amount: 4, per: 'card'},
      metadata: {
        cardNumber: 'C49',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a Space card, you pay 4 M€ less for it.', (eb) => {
            eb.tag(Tag.SPACE).startEffect.megacredits(-4);
          });
        }),
        description: 'Requires 5 Science tags.',
      },
    });
  }
}
