import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class StellarEngine extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.STELLAR_ENGINE,
      tags: [Tag.GALACTIC, Tag.GALACTIC],
      cost: 97,

      requirements: {tag: Tag.SCIENCE, count: 11},
      victoryPoints: {tag: Tag.GALACTIC, each: 3},

      cardDiscount: {amount: 5},

      metadata: {
        cardNumber: 'SOL20',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a card, you pay 5 M€ less for it.', (eb) => {
            eb.empty().startEffect.megacredits(-5);
          }).br;
          b.vpText('3 VP for each Galactic tag you have.');
        }),
        description: 'Requires 11 Science tags.',
      },
    });
  }
}
