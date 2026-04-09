import {inplaceRemove} from '../../common/utils/utils';
import {Resource} from '../../common/Resource';
import {CardAction, IPlayer} from '../IPlayer';
import {IPreludeCard} from '../cards/prelude/IPreludeCard';
import {SelectCard} from '../inputs/SelectCard';

export class PreludesExpansion {
  public static fizzle(player: IPlayer, card: IPreludeCard): void {
    player.game.log('${0} fizzled. ${1} gains 15 M€.', (b) => b.card(card).player(player));
    player.stock.add(Resource.MEGACREDITS, 15);
    player.defer(() => {
      // This is deferred because it is possible for the parent card to
      // be moved from hand to play area. So, wait until this action finishes and
      // then follow up with cleanup.
      inplaceRemove(player.preludeCardsInHand, card);
      player.playedCards.remove(card);
      player.game.preludeDeck.discard(card);
    });
  }

  /**
   * Return a `SelectCard` that asks a `player` to choose one of the `cards` to play,
   * and then plays it.
   */
  public static selectPreludeToPlay(
    player: IPlayer,
    cards: Array<IPreludeCard>,
    remainders: undefined | 'discard' = undefined,
    cardAction: CardAction = 'add'): SelectCard<IPreludeCard> {
    const playableFlags = cards.map((card) => {
      card.warnings.clear();
      const playable = card.canPlay(player);
      if (card.behavior?.addResources && player.game.inDoubleDown) {
        card.warnings.add('ineffectiveDoubleDown');
      }
      return playable;
    });
    playableFlags.forEach((playable, index) => {
      if (playable) {
        return;
      }
      cards[index].warnings.add('preludeFizzle');
    });

    return new SelectCard(
      'Select prelude card to play', 'Play', cards)
      .andThen(([card]) => {
        if (card.canPlay?.(player) === false) {
          PreludesExpansion.fizzle(player, card);
        } else {
          player.playCard(card, undefined, cardAction);
        }
        if (remainders === 'discard') {
          for (const c of cards) {
            if (c !== card) {
              player.game.preludeDeck.discard(c);
            }
          }
        }
        return undefined;
      });
  }
}
