import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class LightningAccumulators extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.LIGHTNING_ACCUMULATORS,
      tags: [Tag.POWER, Tag.JOVIAN],
      cost: 23,
      victoryPoints: 1,

      behavior: {
        production: {energy: 3},
      },

      metadata: {
        cardNumber: 'H34',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(3));
        }),
        description: 'Increase your energy production 3 steps.',
      },
    });
  }
}
