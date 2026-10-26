import {CardName} from '@/common/cards/CardName';
import {Size} from '@/common/cards/render/Size';
import {IPlayer} from '@/server/IPlayer';
import {uppercase} from '@/server/cards/Options';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {PlayProjectCard} from '@/server/deferredActions/PlayProjectCard';
import {PreludesExpansion} from '@/server/preludes/PreludesExpansion';

export class EccentricSponsorRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.ECCENTRIC_SPONSOR_REBALANCED,
      metadata: {
        cardNumber: 'P11',
        renderData: CardRenderer.builder((b) => {
          b.text('Play a card from hand, reducing its cost by 27 M€', {size: Size.SMALL, uppercase});
        }),
      },
    });
  }

  public override getCardDiscount(player: IPlayer) {
    return player.lastCardPlayed === this.name ? 27 : 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new PlayProjectCard(player))
      .andThen((card) => {
        if (card === undefined) {
          PreludesExpansion.fizzle(player, this);
          player.lastCardPlayed = undefined;
        }
      });
    return undefined;
  }
}
