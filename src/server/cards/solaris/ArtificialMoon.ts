import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ArtificialMoon extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ARTIFICIAL_MOON,
      tags: [Tag.EARTH, Tag.SPACE, Tag.GALACTIC],
      cost: 35,

      requirements: {tag: Tag.EARTH, count: 6},
      victoryPoints: {tag: Tag.GALACTIC, each: 3},

      action: {
        drawCard: 4,
      },

      metadata: {
        cardNumber: 'SL08',
        renderData: CardRenderer.builder((b) => {
          b.action('Draw 4 cards.', (eb) => {
            eb.empty().startAction.cards(4);
          }).br;
          b.vpText('3 VP for each Galactic tag you have, including this.');
        }),
        description: 'Requires 6 Earth tags.',
      },
    });
  }
}
