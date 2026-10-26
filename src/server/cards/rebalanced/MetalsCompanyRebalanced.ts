import {CardName} from '@/common/cards/CardName';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class MetalsCompanyRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.METALS_COMPANY_REBALANCED,

      behavior: {
        production: {megacredits: 1, steel: 1, titanium: 1},
        stock: {megacredits: 2},
      },

      metadata: {
        cardNumber: 'P20',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1).steel(1).titanium(1)).br;
          b.megacredits(2);
        }),
        description: 'Increase your MC, steel and titanium production 1 step. Gain 2 MC.',
      },
    });
  }
}
