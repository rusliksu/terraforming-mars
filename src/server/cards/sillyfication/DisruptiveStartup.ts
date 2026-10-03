import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ActionCard} from '../ActionCard';
import {IProjectCard} from '../IProjectCard';

export class DisruptiveStartup extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.DISRUPTIVE_STARTUP,
      tags: [Tag.SCIENCE, Tag.EARTH],
      cost: 14,
      victoryPoints: -1,

      action: {
        spend: {cards: 1},
        stock: {megacredits: 5},
      },

      metadata: {
        cardNumber: 'X13',
        renderData: CardRenderer.builder((b) => {
          b.action('Sell a card from hand to gain 5 M€.', (eb) => {
            eb.cards(1).startAction.megacredits(5);
          });
        }),
      },
    });
  }
}
