import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class ChillingRiches extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.CHILLING_RICHES,
      tags: [Tag.BUILDING],
      cost: 20,

      behavior: {
        production: {heat: -3, megacredits: 11},
      },

      metadata: {
        cardNumber: 'X44',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().heat(3).nbsp.plus().megacredits(11, {digit}));
        }),
        description: 'Decrease your heat production 3 steps. Increase your M€ production 11 steps.',
      },
    });
  }
}
