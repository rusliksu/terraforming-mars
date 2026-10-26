import {IProjectCard} from '../IProjectCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {SilverActionCard} from './SilverActionCard';

export class AutoFactory extends SilverActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.AUTO_FACTORY,
      cost: 2,

      resourceType: CardResource.ORE,

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              title: 'Add 1 ore to this card',
              addResources: 1,
            },
            {
              title: 'Spend 1 ore from this card to gain 1 titanium',
              spend: {resourcesHere: 1},
              stock: {titanium: 1},
            },
            {
              title: 'Spend 1 ore from this card to gain 2 steel',
              spend: {resourcesHere: 1},
              stock: {steel: 2},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'HO05',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.ORE, 1).arrow().titanium(1).nbsp.or().br;
          b.resource(CardResource.ORE, 1).arrow().steel(2).br;
          b.plainText(
            'Action: Add 1 ore to this card, or spend 1 ore from this card to gain 1 titanium or 2 steel.',
            /* parens */ true);
        }),
      },
    });
  }
}
