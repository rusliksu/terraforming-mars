import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ActionCard} from '../ActionCard';
import {all} from '../Options';

export class Horses extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.HORSES,
      tags: [Tag.ANIMAL],
      cost: 11,
      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}, per: 2},

      requirements: {oxygen: 10},

      behavior: {
        production: {plants: -1},
        decreaseAnyProduction: {type: Resource.PLANTS, count: 1},
      },

      action: {
        addResources: 3,
      },

      metadata: {
        cardNumber: 'X38',
        renderData: CardRenderer.builder((b) => {
          b.action('Add 3 animals to this card.', (eb) => {
            eb.empty().startAction.resource(CardResource.ANIMAL, {amount: 3});
          }).br;
          b.production((pb) => pb.minus().plants(1).nbsp.minus().plants(1, {all}));
        }),
        description: 'Requires 10% oxygen. Decrease your plant production 1 step and any plant production 1 step. ' +
          '1 VP per 2 animals on this card.',
      },
    });
  }
}
