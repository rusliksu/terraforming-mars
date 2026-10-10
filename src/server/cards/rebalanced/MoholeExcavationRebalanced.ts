import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class MoholeExcavationRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.MOHOLE_EXCAVATION_REBALANCED,
      tags: [Tag.BUILDING],

      behavior: {
        production: {steel: 1, heat: 2},
        stock: {steel: 5},
      },

      metadata: {
        cardNumber: 'P23',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.steel(1).br;
            pb.heat(2);
          }).steel(5, {digit: true});
        }),
        description: 'Increase your steel production 1 step and heat production 2 steps. Gain 5 steel.',
      },
    });
  }
}
