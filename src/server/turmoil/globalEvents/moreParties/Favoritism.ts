import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Turmoil} from '../../Turmoil';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

/**
 * Favoritism (More Parties, fan) / "Transparence Politics": each player loses up to 5 of their
 * own delegates already placed on the Turmoil board (never from an unplaced reserve delegate,
 * which can't be "lost" from play), reduced by one for every 3 cards in their hand.
 */
export class Favoritism extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.FAVORITISM,
      description: 'Each player loses 5 delegates. Reduce the loss by one for every 3 cards in that player\'s hand.',
      revealedDelegate: PartyName.POPULISTS,
      currentDelegate: PartyName.BUREAUCRATS,
      renderData: CardRenderer.builder((b) => {
        b.minus().delegates(5, {size: Size.MEDIUM}).slash().text('3 cards', {size: Size.SMALL});
      }),
    });
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const game = player.game;
    const turmoil = Turmoil.getTurmoil(game);

    let loss = Math.max(0, 5 - Math.floor(player.cardsInHand.length / 3));
    if (loss <= 0) {
      return;
    }

    const initialLoss = loss;
    for (const party of turmoil.parties) {
      if (loss <= 0) {
        break;
      }
      let count = party.delegates.count(player);
      while (count > 0 && loss > 0) {
        turmoil.removeDelegateFromParty(player, party.name, game);
        count--;
        loss--;
      }
    }

    const delegatesLost = initialLoss - loss;
    if (delegatesLost > 0) {
      game.log('${0} lost ${1} delegate(s) due to Favoritism', (b) => b.player(player).number(delegatesLost));
    }
  }
}
