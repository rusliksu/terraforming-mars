import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {SelectCard} from '../../inputs/SelectCard';
import {LogHelper} from '../../LogHelper';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class CompanyCartel extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.COMPANY_CARTEL,
      cost: 8,

      metadata: {
        cardNumber: 'CB50',
        renderData: CardRenderer.builder((b) => {
          b.text(
            'Draw cards equal to twice the number of players. Choose 2 to add to your hand. ' +
            'Each other player, in turn, chooses one of the remaining cards to add to their hand. Discard the rest.',
            {size: Size.SMALL});
        }),
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.projectDeck.canDraw(2 * player.game.players.length);
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const revealed = game.projectDeck.drawN(game, 2 * game.players.length);
    LogHelper.logRevealedCards(player, revealed);

    return new SelectCard('Choose 2 cards to add to your hand', 'Keep', revealed, {min: 2, max: 2})
      .andThen((kept) => {
        player.cardsInHand.push(...kept);
        game.log('${0} added ${1} card(s) to hand', (b) => b.player(player).number(kept.length));
        const remaining = revealed.filter((card) => !kept.includes(card));
        this.offerToOthers(player, remaining, player.opponents);
        return undefined;
      });
  }

  /** Lets each other player, in turn, take one card from `remaining`; whatever nobody takes is discarded. */
  private offerToOthers(player: IPlayer, remaining: ReadonlyArray<IProjectCard>, others: ReadonlyArray<IPlayer>): void {
    const game = player.game;
    if (others.length === 0) {
      if (remaining.length > 0) {
        game.projectDeck.discard(...remaining);
        game.log('${0} discarded ${1} unclaimed card(s)', (b) => b.player(player).number(remaining.length));
      }
      return;
    }

    const [other, ...rest] = others;
    if (remaining.length === 0) {
      this.offerToOthers(player, remaining, rest);
      return;
    }

    other.defer(new SelectCard('Select a card to add to your hand', 'Take', remaining, {min: 1, max: 1})
      .andThen(([selected]) => {
        other.cardsInHand.push(selected);
        game.log('${0} took ${1} into hand', (b) => b.player(other).card(selected));
        const newRemaining = remaining.filter((card) => card !== selected);
        this.offerToOthers(player, newRemaining, rest);
        return undefined;
      }));
  }
}
