import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class LaunchOfThePhoenix extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.LAUNCH_OF_THE_PHOENIX,
      tags: [Tag.SCIENCE, Tag.EARTH, Tag.SPACE],
      cost: 18,
      victoryPoints: 5,

      requirements: {tag: Tag.SCIENCE, count: 7},

      metadata: {
        cardNumber: 'H14',
        renderData: CardRenderer.builder((b) => {
          b.text('A monument to human ingenuity.');
        }),
        description: 'Requires 7 science tags.',
      },
    });
  }
}
