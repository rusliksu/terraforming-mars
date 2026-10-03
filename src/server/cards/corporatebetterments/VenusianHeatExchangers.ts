import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';

export class VenusianHeatExchangers extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUSIAN_HEAT_EXCHANGERS,
      tags: [Tag.VENUS],
      cost: 12,

      requirements: {venus: 14},

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              title: 'Decrease your heat production 2 steps to raise your TR 1 step',
              production: {heat: -2},
              tr: 1,
            },
            {
              title: 'Remove 2 floaters from any card to increase your heat production 2 steps',
              removeResourcesFromAnyCard: {type: CardResource.FLOATER, count: 2},
              production: {heat: 2},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'B40',
        renderData: CardRenderer.builder((b) => {
          b.plainText(
            'Action: Decrease your heat production 2 steps to raise your TR 1 step, ' +
            'or remove 2 floaters from any card to increase your heat production 2 steps.', true);
        }),
        description: 'Requires 14% Venus.',
      },
    });
  }
}
