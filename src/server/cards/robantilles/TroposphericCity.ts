import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {SpaceName} from '../../../common/boards/SpaceName';
import {CardRenderer} from '../render/CardRenderer';

export class TroposphericCity extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.TROPOSPHERIC_CITY,
      tags: [Tag.CITY, Tag.VENUS, Tag.JOVIAN],
      cost: 27,

      victoryPoints: {tag: Tag.VENUS, per: 2},

      behavior: {
        city: {space: SpaceName.TROPOSPHERIC_CITY},
      },

      metadata: {
        cardNumber: 'H24',
        renderData: CardRenderer.builder((b) => {
          b.city().br;
          b.vpText('1 VP per 2 Venus tags you have.');
        }),
        description: 'Place this city ON THE RESERVED AREA on Venus.',
      },
    });
  }
}
