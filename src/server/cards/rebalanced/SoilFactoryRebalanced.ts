import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class SoilFactoryRebalanced extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SOIL_FACTORY_REBALANCED,
      tags: [Tag.BUILDING],
      cost: 10,

      behavior: {
        production: {energy: -1, plants: 2},
      },
      victoryPoints: 1,

      metadata: {
        cardNumber: '179',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().energy(1).br;
            pb.plus().plants(2);
          });
        }),
        description: 'Decrease your Energy production 1 step and increase your Plant production 2 step.',
      },
    });
  }
}
