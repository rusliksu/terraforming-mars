import {CardName} from '@/common/cards/CardName';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {IPlayer} from '@/server/IPlayer';
import {SelectPaymentDeferred} from '@/server/deferredActions/SelectPaymentDeferred';

export class HugeAsteroidRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.HUGE_ASTEROID_REBALANCED,
      startingMegacredits: -2,

      behavior: {
        global: {temperature: 3},
      },

      metadata: {
        cardNumber: 'P15',
        renderData: CardRenderer.builder((b) => {
          b.temperature(3).br;
          b.megacredits(-2);
        }),
        description: 'Increase Temperature 3 steps. Pay 2 MC.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer) {
    return player.canAfford(2);
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new SelectPaymentDeferred(player, -this.startingMegaCredits));
    return undefined;
  }
}
