import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class CoreMines extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.CORE_MINES,
      tags: [Tag.BUILDING],
      cost: 13,

      behavior: {
        production: {steel: 1, titanium: 1},
      },

      metadata: {
        cardNumber: 'X27',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.steel(1).titanium(1));
        }),
        description: 'Increase your steel production and your titanium production 1 step each.',
      },
    });
  }
}
