import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class HighPressureSuits extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.HIGH_PRESSURE_SUITS,
      tags: [Tag.JOVIAN],
      cost: 8,
      requirements: {tag: Tag.JOVIAN, count: 2, max: true},
      victoryPoints: 2,

      metadata: {
        cardNumber: 'V73',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Requires that you own at most 2 Jovian tags.', true);
        }),
      },
    });
  }
}
