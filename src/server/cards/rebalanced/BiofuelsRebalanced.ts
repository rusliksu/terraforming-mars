import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class BiofuelsRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.BIOFUELS_REBALANCED,
      tags: [Tag.MICROBE, Tag.POWER],

      behavior: {
        production: {energy: 2, plants: 1},
        stock: {plants: 2},
      },

      metadata: {
        cardNumber: 'P03',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(2).plants(1)).br;
          b.plants(2);
        }),
        description: 'Increase your energy by two steps and plant production 1 step. Gain 2 plants.',
      },
    });
  }
}
