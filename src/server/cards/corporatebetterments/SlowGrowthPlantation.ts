import {IActionCard} from '@/server/cards/ICard';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {ActionCard} from '@/server/cards/ActionCard';
import {CardType} from '@/common/cards/CardType';
import {CardResource} from '@/common/CardResource';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class SlowGrowthPlantation extends ActionCard implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SLOW_GROWTH_PLANTATION,
      tags: [Tag.MICROBE],
      cost: 12,

      resourceType: CardResource.MICROBE,
      requirements: {oxygen: 4},

      behavior: {
        addResources: 3,
      },

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {title: 'Add 1 microbe to this card', addResources: 1},
            {title: 'Remove 5 microbes from this card to place a greenery tile', spend: {resourcesHere: 5}, greenery: {}},
          ],
        },
      },

      metadata: {
        cardNumber: 'CB04',
        renderData: CardRenderer.builder((b) => {
          b.action('Add 1 microbe to this card, OR remove 5 microbes here to place a greenery tile.', (eb) => {
            eb.empty().startAction.resource(CardResource.MICROBE);
          }).br;
          b.resource(CardResource.MICROBE, {amount: 5, digit: true}).arrow().greenery();
        }),
        description: 'Requires 4% oxygen. Add 3 microbes to this card.',
      },
    });
  }
}
