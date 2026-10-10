import {CardName} from '@/common/cards/CardName';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class DonationRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.DONATION_REBALANCED,

      behavior: {
        stock: {megacredits: 23},
      },

      metadata: {
        cardNumber: 'P08',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(23);
        }),
        description: 'Gain 23 M€.',
      },
    });
  }
}
