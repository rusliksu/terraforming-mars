import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class InterplanetaryCruise extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.INTERPLANETARY_CRUISE,
      tags: [Tag.JOVIAN, Tag.SPACE],
      cost: 32,
      victoryPoints: 4,

      requirements: {tr: 27},

      behavior: {
        production: {titanium: 2},
      },

      metadata: {
        cardNumber: 'H65',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.titanium(2));
        }),
        description: 'Requires that you have at least 27 TR. Increase your titanium production 2 steps.',
      },
    });
  }
}
