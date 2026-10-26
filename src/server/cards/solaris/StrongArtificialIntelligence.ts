import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

/**
 * Strong Artificial Intelligence (Solaris, fan): confirmed against the printed card - 2 Wild
 * tags.
 *
 * Same effect and same implementation approach as Cyborgs -- see
 * Tags.wildTagsMatchAnyTagForTriggers() for the "Wild tags count as any tag of your choice"
 * implementation and scoping notes.
 */
export class StrongArtificialIntelligence extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 11,
      tags: [Tag.WILD, Tag.WILD],
      name: CardName.STRONG_ARTIFICIAL_INTELLIGENCE,
      type: CardType.AUTOMATED,

      requirements: {party: PartyName.TRANSHUMANISTS},

      behavior: {
        stock: {megacredits: 1},
      },

      metadata: {
        cardNumber: 'SOL23',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(1).br;
          b.effect('Your WILD tags count as any tag of your choice, for other cards\' tag-triggered effects.', (eb) => {
            eb.wild(1).startEffect.text('ANY TAG', {size: Size.SMALL});
          });
        }),
        description: 'Requires that Transhumanists are ruling or that you have 2 delegates there. ' +
          'Gain 1 M€. Your Wild tags count as any tag of your choice for the purpose of triggering other cards\' tag-based effects.',
      },
    });
  }
}
