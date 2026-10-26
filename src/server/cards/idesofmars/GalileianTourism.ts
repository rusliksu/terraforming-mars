import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class GalileianTourism extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GALILEIAN_TOURISM,
      tags: [Tag.JOVIAN],
      cost: 22,

      requirements: {tag: Tag.JOVIAN, count: 2},
      victoryPoints: {tag: Tag.JOVIAN},

      behavior: {
        production: {megacredits: 1},
      },

      metadata: {
        cardNumber: '138',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1)).br;
          b.vpText('1 VP per Jovian tag you have.');
        }),
        description: 'Requires 2 Jovian tags. Increase your M€ production 1 step.',
      },
    });
  }
}
