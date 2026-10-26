import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class OrbitalBiologicalLaboratory extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ORBITAL_BIOLOGICAL_LABORATORY,
      tags: [Tag.MICROBE, Tag.SPACE],
      cost: 10,

      resourceType: CardResource.MICROBE,

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              title: 'Add 2 microbes to this card',
              addResources: 2,
            },
            {
              title: 'Remove 1 microbe from this card to gain 3 M€',
              spend: {resourcesHere: 1},
              stock: {megacredits: 3},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'H59',
        renderData: CardRenderer.builder((b) => {
          b.arrow().resource(CardResource.MICROBE, 2).nbsp.or().br;
          b.resource(CardResource.MICROBE).arrow().megacredits(3).br;
          b.plainText('Action: add 2 microbes to this card, or remove 1 microbe from this card to gain 3 M€.', true);
        }),
      },
    });
  }
}
