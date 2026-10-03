import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {SilverCard} from './SilverCard';

export class NavigationalBeacon extends SilverCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.NAVIGATIONAL_BEACON,
      cost: 3,

      cardDiscount: {tag: Tag.SPACE, amount: 1},

      metadata: {
        cardNumber: 'HO09',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a card with a Space tag, you pay 1 M€ less for it.', (eb) => {
            eb.tag(Tag.SPACE).startEffect.megacredits(-1);
          });
        }),
      },
    });
  }
}
