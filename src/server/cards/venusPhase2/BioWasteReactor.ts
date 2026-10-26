import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class BioWasteReactor extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BIO_WASTE_REACTOR,
      tags: [Tag.ANIMAL, Tag.MICROBE],
      cost: 8,

      action: {
        spend: {plants: 4},
        or: {
          autoSelect: false,
          behaviors: [
            {
              title: 'Add 2 microbes to any card',
              addResourcesToAnyCard: {type: CardResource.MICROBE, count: 2},
            },
            {
              title: 'Add 1 animal to any card',
              addResourcesToAnyCard: {type: CardResource.ANIMAL, count: 1},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'V55',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 4 plants to add 2 microbes OR 1 animal to any card.', (eb) => {
            eb.plants(4, {digit}).startAction.resource(CardResource.MICROBE, 2).slash().resource(CardResource.ANIMAL, 1);
          });
        }),
      },
    });
  }
}
