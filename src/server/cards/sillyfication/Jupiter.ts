import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';

export class Jupiter extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.JUPITER,
      tags: [Tag.JOVIAN, Tag.JOVIAN, Tag.JOVIAN],
      cost: 50,
      victoryPoints: 6,

      requirements: {tag: Tag.JOVIAN, count: 3},

      metadata: {
        cardNumber: 'T24',
        description: 'Requires 3 Jovian tags. Yes, the planet itself',
      },
    });
  }
}
