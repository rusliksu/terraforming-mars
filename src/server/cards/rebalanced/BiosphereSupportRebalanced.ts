import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class BiosphereSupportRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.BIOSPHERE_SUPPORT_REBALANCED,
      tags: [Tag.PLANT],

      behavior: {
        production: {plants: 2, megacredits: 1},
      },

      metadata: {
        cardNumber: 'P05',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(2).megacredits(1));
        }),
        description: 'Increase your plant production 2 steps and M€ production 1 step.',
      },
    });
  }
}
