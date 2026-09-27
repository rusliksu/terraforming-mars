import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ExcavationSyriaPlanum extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.EXCAVATION_SYRIA_PLANUM,
      tags: [],
      cost: 5,

      tagCardRequirementBonus: {steps: 2, tag: Tag.SCIENCE, nextCardOnly: true},

      metadata: {
        cardNumber: 'H17',
        renderData: CardRenderer.builder((b) => {
          b.plate('Next card').colon().tag(Tag.SCIENCE).text('-2');
        }),
        description: 'The next card you play has its requirements reduced by 2 Science tags.',
      },
    });
  }
}
