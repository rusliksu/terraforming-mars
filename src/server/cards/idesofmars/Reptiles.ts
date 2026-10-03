import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class Reptiles extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.REPTILES,
      tags: [Tag.ANIMAL],
      cost: 8,

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}},
      requirements: {temperature: 0},

      action: {
        spend: {heat: 5},
        addResources: 1,
      },

      metadata: {
        cardNumber: 'Im65',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 5 heat to add an animal to this card.', (eb) => {
            eb.heat(5).startAction.resource(CardResource.ANIMAL);
          }).br;
          b.vpText('1 VP for every animal on this card.');
        }),
        description: 'Requires 0°C or warmer.',
      },
    });
  }
}
