import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Solaris (fan): Anti Fraud Investigation.
 *
 * On play, no player (including the one who played this) may remove resources from any card
 * for the rest of this generation. Tracked via the new game-wide, generation-scoped flag
 * `IGame.resourceRemovalBlockedThisGeneration` (see Game.ts / IGame.ts), reset to false at the
 * start of every generation the same way `cardsPlayedThisGeneration` is (High Orbit's Planetary
 * Outpost precedent).
 *
 * The flag is enforced at `RemoveResourcesFromCard.getAvailableTargetCards` -- the shared choke
 * point used both by the declarative `removeResourcesFromAnyCard` behavior and by most bespoke
 * "remove a resource from any card" effects (e.g. Predators, GMO-style attacks). This is a broad
 * block covering the great majority of resource-removal effects in the codebase, but it is not
 * exhaustive: a handful of cards call `player.removeResourceFrom(...)` directly instead of going
 * through `RemoveResourcesFromCard` (e.g. Space Privateers removing its own fighters as a
 * self-penalty when an attack is blocked) and are not intercepted by this guard. A fully
 * exhaustive, no-exceptions block would require auditing every direct resource-removal call site
 * in the codebase, which was judged too invasive for this card's scope.
 */
export class AntiFraudInvestigation extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.ANTI_FRAUD_INVESTIGATION,
      tags: [],
      cost: 1,

      requirements: {party: PartyName.CENTRISTS},

      metadata: {
        cardNumber: 'So41',
        renderData: CardRenderer.builder((b) => {
          b.text('For the rest of this generation, no player may remove resources from any card.');
        }),
        description: 'Requires that the Centrists are ruling or that you have 2 delegates there.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.game.resourceRemovalBlockedThisGeneration = true;
    player.game.log(
      '${0} played ${1}: no resources may be removed from any card for the rest of this generation',
      (b) => b.player(player).card(this));
    return undefined;
  }
}
