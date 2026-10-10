import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {Tag} from '@/common/cards/Tag';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all} from '@/server/cards/Options';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {IPlayer} from '@/server/IPlayer';
import {GlobalParameter} from '@/common/GlobalParameter';
import {Phase} from '@/common/Phase';
import {Resource} from '@/common/Resource';

export class AphroditeRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.APHRODITE_REBALANCED,
      tags: [Tag.PLANT, Tag.VENUS],
      startingMegaCredits: 50,

      behavior: {
        production: {plants: 2},
      },

      metadata: {
        cardNumber: 'R01',
        description: 'You start with 2 plant production and 50 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.production((pb) => pb.plants(2)).nbsp.megacredits(50);
          b.corpBox('effect', (ce) => {
            ce.effect('Whenever Venus is terraformed 1 step, you gain 3 M€ and the player (not WGT) who raised it gains 2 M€.', (eb) => {
              eb.venus(1, {all}).startEffect.megacredits(2, {all}).asterix().nbsp.megacredits(3);
            });
          });
        }),
      },
    });
  }

  public getGlobalParameterIncreaseMegaCredits(owner: IPlayer, activePlayer: IPlayer, parameter: GlobalParameter, steps: number): number {
    if (parameter !== GlobalParameter.VENUS || (owner.game.phase !== Phase.ACTION && owner.game.phase !== Phase.PRELUDES)) {
      return 0;
    }
    return (owner === activePlayer ? 5 : 2) * steps;
  }

  public onGlobalParameterIncreaseByAnyPlayer(owner: IPlayer, activePlayer: IPlayer, parameter: GlobalParameter, steps: number) {
    if (parameter !== GlobalParameter.VENUS) {
      return;
    }
    owner.stock.add(Resource.MEGACREDITS, 3 * steps, {log: true, from: {card: this}});
    if (owner.game.phase === Phase.ACTION || owner.game.phase === Phase.PRELUDES) {
      activePlayer.stock.add(Resource.MEGACREDITS, 2 * steps, {log: true, from: {card: this}});
    }
  }
}
