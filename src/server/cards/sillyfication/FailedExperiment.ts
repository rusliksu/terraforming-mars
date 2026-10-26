import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';

export class FailedExperiment extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.FAILED_EXPERIMENT,
      tags: [Tag.SCIENCE],
      cost: 2,
      victoryPoints: -1,

      behavior: {
        spend: {cards: 1},
        drawCard: 2,
      },

      metadata: {
        cardNumber: 'X12',
        renderData: CardRenderer.builder((b) => {
          b.minus().cards(1).colon().cards(2);
        }),
        description: 'Discard 1 card from your hand. Draw 2 cards.',
      },
    });
  }
}
