import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MonumentToMars extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MONUMENT_TO_MARS,
      tags: [Tag.EARTH],
      cost: 26,

      victoryPoints: {tag: Tag.EARTH, per: 2},

      behavior: {
        production: {megacredits: 3},
      },

      metadata: {
        cardNumber: 'H42',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(3)).br;
          b.vpText('1 VP per 2 Earth tags you have.');
        }),
        description: 'Increase your M€ production 3 steps.',
      },
    });
  }
}
