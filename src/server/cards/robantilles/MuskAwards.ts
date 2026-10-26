import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MuskAwards extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MUSK_AWARDS,
      tags: [Tag.EARTH],
      cost: 32,

      victoryPoints: {tag: Tag.SCIENCE, per: 2},

      behavior: {
        production: {megacredits: {tag: Tag.SCIENCE}},
      },

      metadata: {
        cardNumber: 'H41',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1).slash().tag(Tag.SCIENCE)).br;
          b.vpText('1 VP per 2 Science tags you have.');
        }),
        description: 'Increase your M€ production 1 step for every Science tag you have.',
      },
    });
  }
}
