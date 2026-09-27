import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {SilverActionCard} from './SilverActionCard';

export class AsteroidMine extends SilverActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ASTEROID_MINE,
      cost: 2,

      resourceType: CardResource.ORE,

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              title: 'Add 2 ore to any Infrastructure-tagged card you own',
              // The `tag` restriction is technically redundant here -- every Silver card
              // carries the Infrastructure tag automatically, and `type: ORE` already limits
              // targets to cards that can hold ore -- but it's kept to match the printed text
              // literally.
              addResourcesToAnyCard: {type: CardResource.ORE, tag: Tag.INFRASTRUCTURE, count: 2},
            },
            {
              title: 'Remove 2 ore from this card to gain 1 energy and 1 heat',
              spend: {resourcesHere: 2},
              stock: {energy: 1, heat: 1},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'HO06',
        renderData: CardRenderer.builder((b) => {
          b.plus().resource(CardResource.ORE, 2).nbsp.or().br;
          b.resource(CardResource.ORE, 2).arrow().energy(1).heat(1).br;
          b.plainText(
            'Action: Add 2 ore to any Infrastructure-tagged card you own, or remove 2 ore from this ' +
            'card to gain 1 energy and 1 heat.', /* parens */ true);
        }),
      },
    });
  }
}
