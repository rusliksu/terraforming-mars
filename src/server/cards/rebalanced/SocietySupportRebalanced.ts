import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {IPlayer} from '@/server/IPlayer';
import {SelectPaymentDeferred} from '@/server/deferredActions/SelectPaymentDeferred';

export class SocietySupportRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.SOCIETY_SUPPORT_REBALANCED,
      tags: [Tag.WILD],
      startingMegacredits: -3,

      behavior: {
        production: {plants: 1, energy: 1, heat: 1},
      },

      metadata: {
        cardNumber: 'P31',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(1).energy(1).heat(1)).br;
          b.megacredits(-3);
        }),
        description: 'Increase your plant, energy and heat production 1 step. Pay 3 M€.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer) {
    return player.canAfford(3);
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new SelectPaymentDeferred(player, -this.startingMegaCredits));
    return undefined;
  }
}
