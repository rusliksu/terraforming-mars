import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class PollutionControl extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.POLLUTION_CONTROL,
      tags: [Tag.EARTH],
      cost: 8,

      behavior: {
        production: {megacredits: -2},
        tr: 2,
      },

      metadata: {
        cardNumber: 'V69',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().megacredits(2)).nbsp.tr(2);
        }),
        description: 'Decrease your M€ production 2 steps. Increase your TR 2 steps.',
      },
    });
  }
}
