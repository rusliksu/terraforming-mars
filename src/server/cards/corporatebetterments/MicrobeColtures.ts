import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MicrobeColtures extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MICROBE_COLTURES,
      tags: [Tag.SCIENCE, Tag.SCIENCE, Tag.MICROBE],
      cost: 4,

      resourceType: CardResource.MICROBE,
      victoryPoints: {resourcesHere: {}, per: 3},
      requirements: {tag: Tag.SCIENCE, count: 2},

      action: {
        or: {
          behaviors: [
            {
              title: 'Spend 1 heat to add 1 microbe to ANY card',
              spend: {heat: 1},
              addResourcesToAnyCard: {type: CardResource.MICROBE, count: 1},
            },
            {
              title: 'Spend 5 heat to add 2 microbes to ANY card',
              spend: {heat: 5},
              addResourcesToAnyCard: {type: CardResource.MICROBE, count: 2},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'CB25',
        renderData: CardRenderer.builder((b) => {
          b.plainText(
            'Action: Spend 1 heat to add 1 microbe to ANY card, ' +
            'or spend 5 heat to add 2 microbes to ANY card.', true).br;
          b.vpText('1 VP for every 3rd Microbe on this card.');
        }),
        description: 'Requires 2 Science tags.',
      },
    });
  }
}
