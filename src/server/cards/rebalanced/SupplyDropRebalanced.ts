import {CardName} from '@/common/cards/CardName';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class SupplyDropRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.SUPPLY_DROP_REBALANCED,

      behavior: {
        stock: {titanium: 3, steel: 7, plants: 3},
      },

      metadata: {
        cardNumber: 'P33',
        renderData: CardRenderer.builder((b) => {
          b.titanium(3, {digit: true}).steel(7, {digit: true}).plants(3, {digit: true});
        }),
        description: 'Gain 3 titanium, 7 steel and 3 plants.',
      },
    });
  }
}
