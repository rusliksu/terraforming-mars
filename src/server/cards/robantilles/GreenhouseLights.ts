import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {IProjectCard} from '../IProjectCard';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';

export class GreenhouseLights extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.GREENHOUSE_LIGHTS,
      tags: [Tag.BUILDING],
      cost: 5,

      requirements: {party: PartyName.EMPOWER},

      action: {
        production: {energy: -1, plants: 1},
      },

      metadata: {
        cardNumber: 'H08',
        renderData: CardRenderer.builder((b) => {
          b.action('Decrease your energy production 1 step to increase your plant production 1 step.', (eb) => {
            eb.production((pb) => pb.energy(1)).startAction.production((pb) => pb.plants(1));
          });
        }),
        description: 'Requires that Empower are ruling or that you have 2 delegates there.',
      },
    });
  }
}
