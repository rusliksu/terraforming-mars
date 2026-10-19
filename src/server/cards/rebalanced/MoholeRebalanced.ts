import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class MoholeRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.MOHOLE_REBALANCED,
      tags: [Tag.BUILDING],

      behavior: {
        production: {heat: 2, energy: 1},
        stock: {energy: 3, heat: 5},
      },

      metadata: {
        cardNumber: 'P22',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.heat(2).energy(1)).br;
          b.energy(3).br;
          b.heat(5);
        }),
        description: 'Increase your heat production 2 steps and energy production 1 step. Gain 3 energy and 5 heat.',
      },
    });
  }
}
