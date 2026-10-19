import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class EnergyHarvest extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.ENERGY_HARVEST,
      tags: [Tag.POWER, Tag.PLANT],
      cost: 2,

      requirements: {greeneryLastAction: true},

      behavior: {
        production: {energy: 2},
      },

      metadata: {
        cardNumber: 'T29',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(2));
        }),
        description: 'Requires that your last action was placing a greenery tile.',
      },
    });
  }
}
