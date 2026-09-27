import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';

export class VenusianFluctuatingPlants extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUSIAN_FLUCTUATING_PLANTS,
      tags: [Tag.VENUS, Tag.PLANT],
      cost: 19,

      resourceType: CardResource.FLOATER,
      victoryPoints: {resourcesHere: {}, per: 2},
      requirements: {venus: 6},

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              title: 'Add 1 floater to any card',
              addResourcesToAnyCard: {count: 1, type: CardResource.FLOATER},
            },
            {
              title: 'Spend 3 plants to add 2 floaters to any card',
              spend: {plants: 3},
              addResourcesToAnyCard: {count: 2, type: CardResource.FLOATER},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'B43',
        renderData: CardRenderer.builder((b) => {
          b.plainText(
            'Action: Add 1 floater to any card, or spend 3 plants to add 2 floaters to any card.', true).br;
          b.vpText('1 VP for every 2 floaters on this card.');
        }),
        description: 'Requires 6% Venus.',
      },
    });
  }
}
