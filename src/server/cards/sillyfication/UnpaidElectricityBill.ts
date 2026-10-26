import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {digit} from '../Options';

export class UnpaidElectricityBill extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.UNPAID_ELECTRICITY_BILL,
      tags: [Tag.POWER],
      cost: 3,

      behavior: {
        production: {energy: -1},
        stock: {megacredits: 9},
      },

      metadata: {
        cardNumber: 'X14',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().energy(1)).megacredits(9, {digit});
        }),
        description: 'Decrease your energy production 1 step. Gain 9 M€.',
      },
    });
  }
}
