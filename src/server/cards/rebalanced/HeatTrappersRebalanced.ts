import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {Resource} from '@/common/Resource';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all} from '@/server/cards/Options';

export class HeatTrappersRebalanced extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.HEAT_TRAPPERS_REBALANCED,
      tags: [Tag.POWER, Tag.BUILDING],
      cost: 6,
      victoryPoints: -1,

      behavior: {
        decreaseAnyProduction: {type: Resource.HEAT, count: 2},
        production: {energy: 1},
      },

      requirements: {temperature: -22},
      metadata: {
        cardNumber: '178',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().heat(2, {all}).br;
            pb.plus().energy(1);
          });
        }),
        description: 'Requires -22 C or warmer. Decrease any heat production 2 steps and increase your energy production 1 step.',
      },
    });
  }
}
