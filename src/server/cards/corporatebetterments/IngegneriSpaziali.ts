import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {SelectCard} from '../../inputs/SelectCard';
import {LogHelper} from '../../LogHelper';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

/**
 * Ingegneri Spaziali is Italian for "Space Engineers"; the printed title is kept as-is.
 */
export class IngegneriSpaziali extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.INGEGNERI_SPAZIALI,
      tags: [Tag.SPACE],
      cost: 20,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'B17',
        renderData: CardRenderer.builder((b) => {
          b.text(
            'Draw and reveal the top 10 cards of the deck. Put all cards with a Space tag into your hand. ' +
            'Each opponent, in turn, chooses one of the remaining cards to add to their hand. Discard the rest.',
            {size: Size.SMALL});
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const revealed = game.projectDeck.drawN(game, 10);
    LogHelper.logRevealedCards(player, revealed);

    const spaceCards = revealed.filter((card) => player.tags.cardHasTag(card, Tag.SPACE));
    const rest = revealed.filter((card) => !spaceCards.includes(card));

    if (spaceCards.length > 0) {
      player.cardsInHand.push(...spaceCards);
      game.log('${0} added ${1} Space card(s) to hand', (b) => b.player(player).number(spaceCards.length));
    }

    this.offerToOpponents(player, rest, player.opponents);
    return undefined;
  }

  /** Lets each opponent, in turn, take one card from `remaining`; whatever nobody takes is discarded. */
  private offerToOpponents(player: IPlayer, remaining: ReadonlyArray<IProjectCard>, opponents: ReadonlyArray<IPlayer>): void {
    if (opponents.length === 0) {
      if (remaining.length > 0) {
        player.game.projectDeck.discard(...remaining);
        player.game.log('${0} discarded ${1} unclaimed card(s)', (b) => b.player(player).number(remaining.length));
      }
      return;
    }

    const [opponent, ...rest] = opponents;
    if (remaining.length === 0) {
      this.offerToOpponents(player, remaining, rest);
      return;
    }

    opponent.defer(new SelectCard('Select a card to add to your hand', 'Take', remaining, {min: 1, max: 1})
      .andThen(([selected]) => {
        opponent.cardsInHand.push(selected);
        player.game.log('${0} took ${1} into hand', (b) => b.player(opponent).card(selected));
        const newRemaining = remaining.filter((card) => card !== selected);
        this.offerToOpponents(player, newRemaining, rest);
        return undefined;
      }));
  }
}
