import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class RawEnergy extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.RAW_ENERGY,
      tags: [Tag.POWER],
      cost: 8,
      victoryPoints: -1,

      behavior: {
        tr: -1,
        production: {energy: 4},
      },

      metadata: {
        cardNumber: 'T26',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(4)).br;
          b.minus().tr(1);
        }),
        description: 'Lose 1 TR. Increase your energy production 4 steps.',
      },
    });
  }
}
