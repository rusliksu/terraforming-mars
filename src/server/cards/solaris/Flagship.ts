import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class Flagship extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.FLAGSHIP,
      tags: [Tag.SPACE],
      cost: 22,

      requirements: {production: Resource.TITANIUM, count: 1},
      resourceType: CardResource.FIGHTER,
      victoryPoints: {resourcesHere: {}},

      action: {
        addResources: 1,
      },

      metadata: {
        cardNumber: 'SL10',
        renderData: CardRenderer.builder((b) => {
          b.action('Add 1 fighter to this card.', (eb) => {
            eb.empty().startAction.resource(CardResource.FIGHTER);
          }).br;
          b.vpText('1 VP for each fighter on this card.');
        }),
        description: 'Requires that you have titanium production.',
      },
    });
  }
}
