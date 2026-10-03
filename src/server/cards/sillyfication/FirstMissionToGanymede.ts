import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {max} from '../Options';

export class FirstMissionToGanymede extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.FIRST_MISSION_TO_GANYMEDE,
      tags: [Tag.JOVIAN],
      cost: 8,

      requirements: {tag: Tag.JOVIAN, count: 1, max},
      victoryPoints: {tag: Tag.JOVIAN, per: 2},

      metadata: {
        cardNumber: 'X79',
        renderData: CardRenderer.builder((b) => {
          b.vpText('1 VP per 2 Jovian tags you have.');
        }),
        description: 'Requires that you have at most 1 Jovian tag.',
      },
    });
  }
}
