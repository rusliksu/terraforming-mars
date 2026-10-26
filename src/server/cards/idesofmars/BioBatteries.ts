import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class BioBatteries extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.BIO_BATTERIES,
      tags: [],
      cost: 4,

      behavior: {
        spend: {plants: 4},
        production: {energy: 2},
      },

      metadata: {
        cardNumber: 'IM135',
        renderData: CardRenderer.builder((b) => {
          b.minus().plants(4, {digit}).production((pb) => pb.energy(2));
        }),
        description: 'Spend 4 plants and increase your energy production 2 steps.',
      },
    });
  }
}
