import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {CardName} from '../../../common/cards/CardName';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

/** Reveals a player's hand privately to the acting player only, using a reservedFor log entry
 * (see src/server/cards/sillyfication/PeerReview.ts for the same technique). */
export class IndustrialSpy extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.INDUSTRIAL_SPY,
      tags: [],
      cost: 1,

      metadata: {
        cardNumber: 'I07',
        renderData: CardRenderer.builder((b) => {
          b.text('Look at a player\'s hand.', {size: Size.SMALL, uppercase: true});
        }),
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.opponents.length > 0;
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    return new SelectPlayer(player.opponents, 'Select a player whose hand to look at', 'Look')
      .andThen((target) => {
        if (target.cardsInHand.length === 0) {
          player.game.log('${0} has no cards in hand', (b) => b.player(target), {reservedFor: player});
        } else {
          player.game.log('${0}\'s hand: ${1}', (b) => b.player(target).cards(target.cardsInHand), {reservedFor: player});
        }
        return undefined;
      });
  }
}
