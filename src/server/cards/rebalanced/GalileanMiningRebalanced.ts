import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class GalileanMiningRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.GALILEAN_MINING_REBALANCED,
      tags: [Tag.JOVIAN],

      behavior: {
        production: {titanium: 2},
      },

      metadata: {
        cardNumber: 'P13',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.titanium(2));
        }),
        description: 'Increase your titanium production 2 steps.',
      },
    });
  }
}
