import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ObjectiveMars extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.OBJECTIVE_MARS,
      tags: [],
      cost: 3,

      resourceType: CardResource.BUDGET,
      victoryPoints: {resourcesHere: {}},

      action: {
        production: {megacredits: -5},
        addResources: 1,
      },

      metadata: {
        cardNumber: 'Im66',
        renderData: CardRenderer.builder((b) => {
          b.action('Decrease your M€ production 5 steps to add a budget resource to this card.', (eb) => {
            eb.production((pb) => pb.megacredits(5)).startAction.resource(CardResource.BUDGET);
          }).br;
          b.vpText('1 VP for every budget resource on this card.');
        }),
      },
    });
  }
}
