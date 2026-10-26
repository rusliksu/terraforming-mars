import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class GreatLeapForward extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GREAT_LEAP_FORWARD,
      tags: [],
      cost: 24,

      requirements: {chairman: true},

      behavior: {
        global: {temperature: 1, oxygen: 1},
        ocean: {},
      },

      metadata: {
        cardNumber: 'I50',
        renderData: CardRenderer.builder((b) => {
          b.temperature(1).oxygen(1).oceans(1);
        }),
        description: 'Requires that you are the Chairman. Raise the temperature 1 step. Raise the oxygen 1 step. Place an ocean tile.',
      },
    });
  }
}
