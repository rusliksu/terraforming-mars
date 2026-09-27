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

/** Every player simultaneously passes one card from their hand to the next player. */
export class RotatingHands extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.ROTATING_HANDS,
      cost: 2,

      metadata: {
        cardNumber: 'X71',
        renderData: CardRenderer.builder((b) => {
          b.cards(1).arrow().cards(1, {all});
        }),
        description: 'Every player chooses a card from their hand. Each of those cards is then passed to the next player.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.players.length >= 2;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const picks: Array<{from: IPlayer, card: IProjectCard}> = [];

    for (const p of game.players) {
      if (p.cardsInHand.length === 0) {
        continue;
      }
      game.defer(new SimpleDeferredAction(p, () =>
        new SelectCard('Select a card to pass to the next player', 'Pass', p.cardsInHand)
          .andThen(([card]) => {
            picks.push({from: p, card});
            return undefined;
          }), Priority.DEFAULT));
    }

    game.defer(new SimpleDeferredAction(player, () => {
      for (const {from, card} of picks) {
        const recipient = game.getPlayerAfter(from);
        inplaceRemove(from.cardsInHand, card);
        recipient.cardsInHand.push(card);
        game.log('${0} passed a card to ${1}', (b) => b.player(from).player(recipient), {reservedFor: from});
      }
      return undefined;
    }, Priority.BACK_OF_THE_LINE));
    return undefined;
  }
}
