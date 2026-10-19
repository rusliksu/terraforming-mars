import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class EarlySettlementRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.EARLY_SETTLEMENT_REBALANCED,
      tags: [Tag.BUILDING, Tag.CITY],

      behavior: {
        production: {plants: 1},
        stock: {plants: 3},
        city: {},
      },

      metadata: {
        cardNumber: 'P09',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(1)).plants(3).br.city();
        }),
        description: 'Increase your plant production 1 step. Gain 3 plants. Place a city tile.',
      },
    });
  }
}
