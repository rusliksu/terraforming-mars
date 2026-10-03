import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {SelectCard} from '../../inputs/SelectCard';
import {SimpleDeferredAction} from '../../deferredActions/DeferredAction';
import {Priority} from '../../deferredActions/Priority';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';
import {inplaceRemove} from '../../../common/utils/utils';

/** Every opponent reveals 2 cards from their hand; you take 2 of them. */
export class ShowAndTell extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.SHOW_AND_TELL,
      cost: 6,

      metadata: {
        cardNumber: 'X72',
        renderData: CardRenderer.builder((b) => {
          b.cards(2, {all}).asterix().nbsp.plus().cards(2);
        }),
        description: 'Every opponent reveals 2 cards from their hand (or their whole hand if they hold fewer). Add 2 of the revealed cards to your hand; the rest are returned.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.opponents.some((p) => p.cardsInHand.length > 0);
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const revealed: Array<{owner: IPlayer, card: IProjectCard}> = [];

    for (const opponent of player.opponents) {
      if (opponent.cardsInHand.length === 0) {
        continue;
      }
      const count = Math.min(2, opponent.cardsInHand.length);
      game.defer(new SimpleDeferredAction(opponent, () =>
        new SelectCard('Reveal 2 cards from your hand', 'Reveal', opponent.cardsInHand, {min: count, max: count})
          .andThen((cards) => {
            for (const card of cards) {
              revealed.push({owner: opponent, card});
            }
            game.log('${0} revealed ${1}', (b) => b.player(opponent).cards(cards));
            return undefined;
          }), Priority.DEFAULT));
    }

    game.defer(new SimpleDeferredAction(player, () => {
      if (revealed.length === 0) {
        return undefined;
      }
      const count = Math.min(2, revealed.length);
      return new SelectCard('Take 2 of the revealed cards', 'Take', revealed.map((r) => r.card), {showOwner: true, min: count, max: count})
        .andThen((cards) => {
          for (const card of cards) {
            const taken = revealed.find((r) => r.card === card);
            if (taken !== undefined) {
              inplaceRemove(taken.owner.cardsInHand, card);
              player.cardsInHand.push(card);
              game.log('${0} took ${1} from ${2}', (b) => b.player(player).card(card).player(taken.owner), {reservedFor: player});
            }
          }
          return undefined;
        });
    }, Priority.BACK_OF_THE_LINE));
    return undefined;
  }
}
