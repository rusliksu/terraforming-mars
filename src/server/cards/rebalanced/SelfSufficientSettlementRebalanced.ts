import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class SelfSufficientSettlementRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.SELF_SUFFICIENT_SETTLEMENT_REBALANCED,
      tags: [Tag.BUILDING, Tag.CITY],

      behavior: {
        production: {megacredits: 2},
        stock: {megacredits: 3},
        city: {},
      },

      metadata: {
        cardNumber: 'P29',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(2)).megacredits(3).br.city();
        }),
        description: 'Increase your money production 2 steps. Gain 3 MC. Place a City tile.',
      },
    });
  }
}
