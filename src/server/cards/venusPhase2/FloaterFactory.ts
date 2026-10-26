import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class FloaterFactory extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.FLOATER_FACTORY,
      tags: [Tag.VENUS, Tag.BUILDING],
      cost: 16,
      victoryPoints: 1,

      behavior: {
        production: {heat: 1},
      },

      action: {
        spend: {heat: 1},
        addResourcesToAnyCard: {type: CardResource.FLOATER, count: 1},
      },

      metadata: {
        cardNumber: 'V79',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 heat to add 1 floater to any card.', (eb) => {
            eb.heat(1, {digit}).startAction.resource(CardResource.FLOATER, 1);
          });
        }),
        description: 'Increase your heat production 1 step.',
      },
    });
  }
}
