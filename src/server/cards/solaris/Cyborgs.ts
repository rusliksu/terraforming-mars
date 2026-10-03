import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

/**
 * Cyborgs (Solaris, fan): confirmed against the printed card - a Wild tag, 1 VP, and 1 M€
 * production (not a one-time M€ gain).
 *
 * See Tags.wildTagsMatchAnyTagForTriggers() for the implementation and scoping notes on the
 * "Wild tags count as any tag of your choice" passive effect shared with Strong Artificial
 * Intelligence.
 */
export class Cyborgs extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 14,
      tags: [Tag.WILD],
      name: CardName.CYBORGS,
      type: CardType.AUTOMATED,
      victoryPoints: 1,

      requirements: {party: PartyName.TRANSHUMANISTS},

      behavior: {
        production: {megacredits: 1},
      },

      metadata: {
        cardNumber: 'SOL22',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1)).br;
          b.effect('Your WILD tags count as any tag of your choice, for other cards\' tag-triggered effects.', (eb) => {
            eb.wild(1).startEffect.text('ANY TAG', {size: Size.SMALL});
          });
        }),
        description: 'Requires that Transhumanists are ruling or that you have 2 delegates there. ' +
          'Increase your M€ production 1 step. Your Wild tags count as any tag of your choice for the purpose of triggering other cards\' tag-based effects.',
      },
    });
  }
}
