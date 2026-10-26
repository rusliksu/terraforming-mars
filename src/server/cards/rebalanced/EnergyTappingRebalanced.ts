import {Card} from '@/server/cards/Card';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {Resource} from '@/common/Resource';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all} from '@/server/cards/Options';

export class EnergyTappingRebalanced extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.ENERGY_TAPPING_REBALANCED,
      type: CardType.AUTOMATED,
      tags: [Tag.POWER],
      cost: 3,
      requirements: {generation: 6},
      victoryPoints: -1,
      behavior: {
        production: {energy: 1},
        decreaseAnyProduction: {type: Resource.ENERGY, count: 1},
      },
      metadata: {
        cardNumber: '201',
        description: 'Decrease any energy production 1 step and increase your own 1 step.',
        renderData: CardRenderer.builder((b) => b.production((pb) => {
          pb.minus().energy(1, {all}).br;
          pb.plus().energy(1);
        })),
      },
    });
  }
}
