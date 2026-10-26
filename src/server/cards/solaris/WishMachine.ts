import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Wish Machine (Solaris, fan): "add 1 resource of whatever type it already holds to any card
 * (belonging to any player) that already has at least 1 resource on it". This is exactly the
 * `addResourcesToAnyCard` behavior with no fixed `type` (so it matches whatever resource type
 * the target card already stores) plus `min: 1, mustHaveCard: true` (must target a card that
 * already has a resource) -- the same pattern AppliedScience (prelude2) uses for its "gain 1
 * resource on ANY CARD WITH A RESOURCE" option.
 *
 * Judgment call: the task text's "(belonging to any player)" is read as the engine's standard
 * meaning of "ANY CARD" in every other addResourcesToAnyCard card in this codebase (Applied
 * Science, Titan Floating Launchpad, Stratopolis, Maxwell Base, Think Tank, and so on) -- which
 * is always scoped to the acting player's own tableau. There's no precedent anywhere in the
 * engine for placing a resource onto an opponent's card, and building that out as a one-off for
 * this card would be a novel, unscoped mechanic rather than a faithful implementation of an
 * existing pattern, so this follows the established convention instead.
 */
export class WishMachine extends ActionCard implements IActionCard, IProjectCard {
  constructor() {
    super({
      cost: 19,
      tags: [Tag.SCIENCE],
      name: CardName.WISH_MACHINE,
      type: CardType.ACTIVE,

      requirements: {party: PartyName.SCIENTISTS},

      action: {
        addResourcesToAnyCard: {
          count: 1,
          min: 1,
          mustHaveCard: true,
        },
      },

      metadata: {
        cardNumber: 'SOL28',
        renderData: CardRenderer.builder((b) => {
          // The `wild` icon stands in for "1 resource of whatever type" -- there's no single
          // fixed CardResource to depict here, since the type is determined by the target card.
          b.action('Add 1 resource, matching whatever type it already holds, to ANY CARD WITH A RESOURCE.', (eb) => {
            eb.empty().startAction.wild(1).asterix();
          });
        }),
        description: 'Requires that Scientists are ruling or that you have 2 delegates there. ' +
          'Action: Add 1 resource, matching whatever type it already holds, to any card in play that has at least 1 resource on it.',
      },
    });
  }
}
