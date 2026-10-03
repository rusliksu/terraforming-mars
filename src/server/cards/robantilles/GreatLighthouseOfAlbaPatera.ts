import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class GreatLighthouseOfAlbaPatera extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GREAT_LIGHTHOUSE_OF_ALBA_PATERA,
      tags: [Tag.MARS, Tag.POWER],
      cost: 19,

      victoryPoints: {tag: Tag.POWER, per: 2},

      metadata: {
        cardNumber: 'H26',
        renderData: CardRenderer.builder((b) => {
          b.vpText('1 VP for every 2 Power tags you own.');
        }),
      },
    });
  }
}
