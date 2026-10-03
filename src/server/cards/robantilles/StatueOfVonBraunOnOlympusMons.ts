import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class StatueOfVonBraunOnOlympusMons extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.STATUE_OF_VON_BRAUN_ON_OLYMPUS_MONS,
      tags: [Tag.MARS, Tag.EARTH, Tag.SPACE],
      cost: 29,

      victoryPoints: {tag: Tag.SPACE, per: 2},

      metadata: {
        cardNumber: 'H29',
        renderData: CardRenderer.builder((b) => {
          b.vpText('1 VP for every 2 Space tags you own.');
        }),
      },
    });
  }
}
