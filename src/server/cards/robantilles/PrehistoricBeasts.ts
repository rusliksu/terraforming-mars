import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class PrehistoricBeasts extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PREHISTORIC_BEASTS,
      tags: [Tag.ANIMAL],
      cost: 10,

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}},
      requirements: {tag: Tag.SCIENCE, count: 5},

      behavior: {
        production: {megacredits: 2},
      },

      action: {
        spend: {plants: 2},
        addResources: 1,
      },

      metadata: {
        cardNumber: 'H51',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 2 plants to add an animal to this card.', (ab) => {
            ab.plants(2).startAction.resource(CardResource.ANIMAL);
          }).br;
          b.production((pb) => pb.megacredits(2)).br;
          b.vpText('1 VP per animal on this card.');
        }),
        description: 'Requires 5 science tags. Increase your M€ production 2 steps.',
      },
    });
  }
}
