import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class PolarIndustriesRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.POLAR_INDUSTRIES_REBALANCED,
      tags: [Tag.BUILDING],

      behavior: {
        production: {heat: 2},
        stock: {megacredits: 5},
        ocean: {},
      },

      metadata: {
        cardNumber: 'P26',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.heat(2)).nbsp.megacredits(5).br;
          b.oceans(1);
        }),
        description: 'Increase your heat production 2 steps. Gain 5 mc. Place an Ocean tile.',
      },
    });
  }
}
