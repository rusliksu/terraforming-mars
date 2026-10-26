import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {DiscardCards} from '../../deferredActions/DiscardCards';

/**
 * An ordinary-looking, ordinarily-playable event - but Cutout Networks (see CutoutNetworks.ts)
 * seeds extra copies of it into the deck at game start (and can slip more in near the top with
 * its action), turning it into a shared trigger every player can stumble into.
 *
 * Known gaps from having several physical copies of the same card in the game at once (a first
 * for this codebase - see the postmortem on the "playing a second copy of a card crashes the
 * game" incident):
 * - `Game.getCardPlayerOrThrow`/`getCardPlayerOrUndefined` (a global name -> owner lookup)
 *   can't disambiguate which copy/owner is meant - safe here only because nothing about this
 *   card's own effect, or Cutout Networks', ever calls it.
 * - `PlayedCards.push()` throws `"Dead Drop already exists"` if a player who has already played
 *   one copy (which stays recorded in their tableau forever, like any other event) tries to
 *   play a second one - see the removal at the end of `bespokePlay` below, which is the actual
 *   fix for that.
 */
export class DeadDrop extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.DEAD_DROP,
      cost: 0,

      metadata: {
        cardNumber: 'X50', // Renumber
        renderData: CardRenderer.builder((b) => {
          b.minus().cards(1).colon().cards(1).slash().megacredits(5);
        }),
        description: 'Discard a card. Then draw a card, or gain 5 M€. This event is discarded after being played, and does not enter your event pile.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.cardsInHand.length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    // DiscardCards.andThen callbacks are fire-and-forget (its own internal .andThen wrappers
    // discard whatever they return) - the follow-up choice has to be queued as its own
    // deferred action rather than returned directly here.
    player.game.defer(new DiscardCards(player, 1, 1)).andThen(() => {
      // Remove this specific instance from the tableau now that its own effect is resolving,
      // rather than letting it sit there forever like a normal one-off event would - that's
      // what lets this player play a *different* physical copy later without PlayedCards.push
      // throwing "Dead Drop already exists". Costs this play 1 count toward "number of events
      // played"-style effects (Media Group, etc.) - an acceptable trade against a hard crash on
      // a later Dead Drop play.
      player.playedCards.remove(this);
      player.defer(() => new OrOptions(
        new SelectOption('Draw a card', 'Draw').andThen(() => {
          player.drawCard();
          return undefined;
        }),
        new SelectOption('Gain 5 M€', 'Gain M€').andThen(() => {
          player.stock.add(Resource.MEGACREDITS, 5, {log: true});
          return undefined;
        }),
      ));
      return undefined;
    });
    return undefined;
  }
}
