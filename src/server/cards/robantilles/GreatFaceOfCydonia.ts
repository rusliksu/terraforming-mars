import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

/**
 * A passive research-phase modifier: +1 card drawn each generation, and (in draft-variant
 * games) may keep 2 cards during the first round of the draft. Both hooks live in
 * '../../Draft.ts' (StandardDraft.cardsToDraw / cardsToKeep), which already has identical
 * per-card checks for Luna Project Office and Mars Maths -- this card is wired in there,
 * not here.
 */
export class GreatFaceOfCydonia extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.GREAT_FACE_OF_CYDONIA,
      tags: [Tag.MARS, Tag.SCIENCE],
      cost: 10,

      requirements: {tag: Tag.SCIENCE, count: 3},

      metadata: {
        cardNumber: 'H27',
        renderData: CardRenderer.builder((b) => {
          b.plainText(
            'Effect: During the research phase, draw 1 additional card. During the first round ' +
            'of the draft variant, you may keep up to 2 cards.', true);
        }),
        description: 'Requires 3 Science tags.',
      },
    });
  }
}
