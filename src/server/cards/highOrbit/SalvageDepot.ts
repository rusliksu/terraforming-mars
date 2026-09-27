import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {keep, LogType} from '../../deferredActions/ChooseCards';
import {SilverActionCard} from './SilverActionCard';

/**
 * High Orbit (fan): Salvage Depot. Action: spend 1 energy to shuffle the shared discard pile,
 * then draw 1 card from it (rather than the usual draw pile).
 *
 * Follows the same "shuffle the discard pile in place, then take cards directly off it"
 * pattern used by Junk Ventures (src/server/cards/community/JunkVentures.ts) and Sistemas
 * Seebeck's reject-shuffling (src/server/cards/pathfinders/SistemasSeebeck.ts) -- `keep()` adds
 * the drawn card straight to the player's hand and fires the normal onCardsDrawn hooks.
 */
export class SalvageDepot extends SilverActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SALVAGE_DEPOT,
      cost: 1,

      action: {
        spend: {energy: 1},
      },

      metadata: {
        cardNumber: 'HO04',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 energy to shuffle the discard pile, then draw 1 card from it.', (eb) => {
            eb.energy(1).startAction.cards(1);
          });
        }),
      },
    });
  }

  public override bespokeCanAct(player: IPlayer): boolean {
    return player.game.projectDeck.discardPile.length > 0;
  }

  public override bespokeAction(player: IPlayer) {
    const game = player.game;
    game.projectDeck.shuffleDiscardPile();
    const card = game.projectDeck.discardPile.pop();
    if (card !== undefined) {
      keep(player, [card], [], LogType.DREW_VERBOSE);
    }
    return undefined;
  }
}
