import {CardName} from '@/common/cards/CardName';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class LoanRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.LOAN_REBALANCED,

      behavior: {
        production: {megacredits: -2},
        stock: {megacredits: 32},
      },

      metadata: {
        cardNumber: 'P17',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().megacredits(2)).br;
          b.megacredits(32);
        }),
        description: 'Gain 32 M€. Decrease your M€ production 2 steps.',
      },
    });
  }
}
