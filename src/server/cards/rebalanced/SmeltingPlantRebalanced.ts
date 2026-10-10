import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class SmeltingPlantRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.SMELTING_PLANT_REBALANCED,
      tags: [Tag.BUILDING],

      behavior: {
        stock: {steel: 4},
        global: {oxygen: 2},
        drawCard: {count: 1, tag: Tag.BUILDING},
      },

      metadata: {
        cardNumber: 'P30',
        renderData: CardRenderer.builder((b) => {
          b.oxygen(2).br;
          b.steel(4).br;
          b.cards(1, {secondaryTag: Tag.BUILDING});
        }),
        description: 'Raise oxygen 2 steps. Gain 4 steel. Draw 1 building card.',
      },
    });
  }
}
