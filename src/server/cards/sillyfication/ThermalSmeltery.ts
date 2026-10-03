import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ActionCard} from '../ActionCard';
import {digit} from '../Options';

export class ThermalSmeltery extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.THERMAL_SMELTERY,
      tags: [Tag.BUILDING],
      cost: 9,

      action: {
        spend: {heat: 6},
        stock: {titanium: 3},
      },

      metadata: {
        cardNumber: 'X29',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 6 heat to gain 3 titanium.', (eb) => {
            eb.heat(6, {digit}).startAction.titanium(3, {digit});
          });
        }),
      },
    });
  }
}
