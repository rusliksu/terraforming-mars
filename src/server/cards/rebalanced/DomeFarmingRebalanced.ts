import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class DomeFarmingRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.DOME_FARMING_REBALANCED,
      tags: [Tag.PLANT, Tag.BUILDING],

      behavior: {
        production: {megacredits: 3, plants: 1},
      },

      metadata: {
        cardNumber: 'P07',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(3).plants(1));
        }),
        description: 'Increase your M€ production 3 steps and plant production 1 step.',
      },
    });
  }
}
