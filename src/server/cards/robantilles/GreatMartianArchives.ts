import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';

export class GreatMartianArchives extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GREAT_MARTIAN_ARCHIVES,
      tags: [Tag.WILD],
      cost: 20,

      requirements: {party: PartyName.TRANSHUMANISTS},

      metadata: {
        cardNumber: 'H47',
        renderData: CardRenderer.builder((b) => {
          b.tag(Tag.WILD);
        }),
        // The printed card also claims this counts as every tag "even when it is in your hand" --
        // not implemented: tag counting in this engine only ever looks at tableau cards, and every
        // discount/requirement/award/milestone computation in the codebase assumes that. Extending
        // that to hand cards would be an invasive, game-wide change for one fan card's flavor
        // clause, so this card is implemented as a normal (tableau-only) wild tag, which is what
        // "counts as having every tag" means for every other wild-tag card once played.
        description: 'Requires that the Transhumanists are ruling or that you have 2 delegates there. ' +
          'This card counts as having every tag.',
      },
    });
  }
}
