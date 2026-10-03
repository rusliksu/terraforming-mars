import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class VenusAircraftHaven extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUS_AIRCRAFT_HAVEN,
      tags: [Tag.VENUS, Tag.BUILDING],
      cost: 13,
      requirements: {venus: 6},
      resourceType: CardResource.FLOATER,
      victoryPoints: {resourcesHere: {}, per: 3},

      behavior: {
        addResources: 2,
      },

      action: {
        or: {
          autoSelect: false,
          behaviors: [
            {
              title: 'Add 1 floater to this card',
              addResources: 1,
            },
            {
              title: 'Remove 3 floaters from this card to raise Venus 1 step',
              spend: {resourcesHere: 3},
              global: {venus: 1},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'V77',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.FLOATER, 2).br;
          b.action('Add 1 floater to this card, OR remove 3 floaters from this card to raise Venus 1 step.', (eb) => {
            eb.empty().startAction.resource(CardResource.FLOATER, 1);
          }).br;
          b.vpText('1 VP per 3 floaters on this card.');
        }),
        description: 'Requires Venus 6% or more. Add 2 floaters to this card.',
      },
    });
  }
}
