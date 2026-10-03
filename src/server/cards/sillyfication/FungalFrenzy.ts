import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ActionCard} from '../ActionCard';

export class FungalFrenzy extends ActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.FUNGAL_FRENZY,
      tags: [Tag.MICROBE],
      cost: 13,
      resourceType: CardResource.MICROBE,

      requirements: {temperature: -8, max: true},

      behavior: {
        addResources: {tag: Tag.MICROBE},
      },

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {
              spend: {resourcesHere: 2},
              production: {plants: 2},
              title: 'Remove 2 microbes to increase your plant production 2 steps',
            },
            {
              addResources: 1,
              title: 'Add 1 microbe to this card',
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'X06',
        renderData: CardRenderer.builder((b) => {
          b.arrow().resource(CardResource.MICROBE).nbsp.or().br;
          b.resource(CardResource.MICROBE, 2).arrow().production((pb) => pb.plants(2)).br;

          b.plainText('Action: Add 1 microbe to this card, or remove 2 microbes to raise your plant production 2 steps.', /* parens */ true);
          b.br;
          b.resource(CardResource.MICROBE).slash().tag(Tag.MICROBE);
        }),
        description: 'Requires -8°C or colder. Add 1 microbe to this card for each microbe tag you have, including this.',
      },
    });
  }
}
