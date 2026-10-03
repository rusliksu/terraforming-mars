import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class SolarWindTrap extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SOLAR_WIND_TRAP,
      cost: 13,
      resourceType: CardResource.ORE,

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              title: 'Add 2 ore to this card',
              addResources: 2,
            },
            {
              title: 'Remove 3 ore from this card to raise Venus 1 step',
              spend: {resourcesHere: 3},
              global: {venus: 1},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'V52',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Action: add 2 ore to this card, OR remove 3 ore from this card to raise Venus 1 step.', true);
        }),
      },
    });
  }
}
