import {Card} from '@/server/cards/Card';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {Resource} from '@/common/Resource';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all} from '@/server/cards/Options';

export class AsteroidMiningConsortiumRebalanced extends Card implements IProjectCard {
  constructor() {
    super({
      name: CardName.ASTEROID_MINING_CONSORTIUM_REBALANCED,
      type: CardType.AUTOMATED,
      tags: [Tag.JOVIAN],
      cost: 13,
      requirements: {generation: 4},
      victoryPoints: 1,
      behavior: {
        production: {titanium: 1},
        decreaseAnyProduction: {type: Resource.TITANIUM, count: 1},
      },
      metadata: {
        cardNumber: '002',
        description: 'Decrease any titanium production 1 step and increase your own 1 step.',
        renderData: CardRenderer.builder((b) => b.production((pb) => {
          pb.minus().titanium(1, {all}).br;
          pb.plus().titanium(1);
        })),
      },
    });
  }
}
