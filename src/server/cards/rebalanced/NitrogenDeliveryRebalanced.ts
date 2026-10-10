import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class NitrogenDeliveryRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.NITROGEN_SHIPMENT_REBALANCED,
      tags: [Tag.EARTH],

      behavior: {
        tr: 2,
        stock: {plants: 5},
      },

      metadata: {
        cardNumber: 'P24',
        renderData: CardRenderer.builder((b) => {
          b.tr(2).plants(5, {digit: true});
        }),
        description: 'Increase your TR 2 step. Gain 5 plant.',
      },
    });
  }
}
