import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class BiomassReactor extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BIOMASS_REACTOR,
      tags: [Tag.POWER, Tag.SCIENCE],
      cost: 28,

      requirements: {tag: Tag.PLANT, count: 2},

      behavior: {
        production: {energy: 4},
      },

      action: {
        production: {energy: -1, plants: 1},
      },

      metadata: {
        cardNumber: 'B15',
        renderData: CardRenderer.builder((b) => {
          b.action('Decrease your energy production 1 step to increase your plant production 1 step.', (eb) => {
            eb.production((pb) => pb.energy(1)).startAction.production((pb) => pb.plants(1));
          }).br;
          b.production((pb) => pb.energy(4));
        }),
        description: 'Requires that you have 2 plant tags. Increase your energy production 4 steps.',
      },
    });
  }
}
