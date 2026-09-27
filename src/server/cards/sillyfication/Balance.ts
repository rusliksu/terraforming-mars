import {PreludeCard} from '../prelude/PreludeCard';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {DiscardCards} from '../../deferredActions/DiscardCards';
import {digit} from '../Options';

const TARGET_HAND_SIZE = 10;

export class Balance extends PreludeCard {
  constructor() {
    super({
      name: CardName.BALANCE,
      behavior: {tr: 1},

      metadata: {
        cardNumber: 'T16',
        renderData: CardRenderer.builder((b) => {
          b.tr(1).nbsp.text('everyone').colon().cards(10, {digit});
        }),
        description: 'Increase your TR 1 step. Every player draws or discards until they have exactly 10 cards in hand.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    for (const p of game.players) {
      const size = p.cardsInHand.length;
      if (size < TARGET_HAND_SIZE) {
        p.drawCard(TARGET_HAND_SIZE - size);
      } else if (size > TARGET_HAND_SIZE) {
        game.defer(new DiscardCards(p, size - TARGET_HAND_SIZE, size - TARGET_HAND_SIZE, 'Discard down to 10 cards'));
      }
    }
    return undefined;
  }
}
