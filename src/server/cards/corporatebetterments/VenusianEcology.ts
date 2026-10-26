import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class VenusianEcology extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUSIAN_ECOLOGY,
      tags: [Tag.VENUS, Tag.PLANT],
      cost: 12,
      victoryPoints: 2,

      requirements: {venus: 12},

      action: {
        spend: {plants: 3},
        global: {venus: 1},
      },

      metadata: {
        cardNumber: 'CB51',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 3 plants to raise Venus 1 step.', (eb) => {
            eb.plants(3).startAction.venus(1);
          });
        }),
        description: 'Requires 12% Venus or higher.',
      },
    });
  }
}
