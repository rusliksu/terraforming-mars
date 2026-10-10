import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class OrbitalConstructionYardRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.ORBITAL_CONSTRUCTION_YARD_REBALANCED,
      tags: [Tag.SPACE],

      behavior: {
        production: {titanium: 1},
        stock: {titanium: 5},
      },

      metadata: {
        cardNumber: 'P25',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.titanium(1)).br;
          b.titanium(5);
        }),
        description: 'Increase your titanium production 1 step. Gain 5 titanium.',
      },
    });
  }
}
