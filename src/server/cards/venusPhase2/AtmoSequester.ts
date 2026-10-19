import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class AtmoSequester extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ATMO_SEQUESTER,
      cost: 13,

      action: {
        spend: {energy: 4},
        global: {venus: 1},
        addResourcesToAnyCard: {type: CardResource.FLOATER, count: 1},
      },

      metadata: {
        cardNumber: 'V51',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 4 energy to raise Venus 1 step and add 1 floater to any card.', (eb) => {
            eb.energy(4, {digit}).startAction.venus(1).nbsp.resource(CardResource.FLOATER, 1);
          });
        }),
      },
    });
  }
}
