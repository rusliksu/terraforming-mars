import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {uppercase} from '../Options';

/**
 * Management Crisis (Solaris, fan): "For the rest of this generation, all opponents may only
 * take 1 action per turn instead of 2."
 *
 * Implementation: Player.oneActionPerTurnActiveGeneration mirrors the existing
 * administrativeDelayActiveGeneration pattern (idesOfMars' Administrative Delay) -- it's set to
 * the current generation number, and self-clears once the generation advances since the stored
 * number stops matching game.generation. Player.takeAction() reads it at the point where
 * availableActionsThisRound is normally reset to 2 at a turn boundary, capping it at 1 instead
 * for the rest of this generation. This card also directly clamps each opponent's
 * availableActionsThisRound for their upcoming/in-progress round, since the persistent flag by
 * itself only takes effect at the *next* turn-boundary reset.
 */
export class ManagementCrisis extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 1,
      tags: [],
      name: CardName.MANAGEMENT_CRISIS,
      type: CardType.EVENT,

      requirements: {party: PartyName.BUREAUCRATS},

      behavior: {
        tr: -1,
      },

      metadata: {
        cardNumber: 'SOL29',
        renderData: CardRenderer.builder((b) => {
          b.text('for the rest of this generation, all opponents may take only 1 action per turn', {size: Size.SMALL, uppercase});
          b.br;
          b.tr(-1);
        }),
        description: 'Requires that Bureaucrats are ruling or that you have 2 delegates there. Decrease your TR 1 step.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    for (const opponent of player.opponents) {
      opponent.oneActionPerTurnActiveGeneration = game.generation;
      opponent.availableActionsThisRound = Math.min(opponent.availableActionsThisRound, 1);
    }
    game.log('${0} limited all opponents to 1 action per turn for the rest of this generation', (b) => b.player(player));
    return undefined;
  }
}
