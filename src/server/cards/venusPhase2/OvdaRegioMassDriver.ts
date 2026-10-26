import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {GlobalParameter} from '../../../common/GlobalParameter';
import {IProjectCard} from '../IProjectCard';

export class OvdaRegioMassDriver extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.OVDA_REGIO_MASS_DRIVER,
      cost: 15,

      metadata: {
        cardNumber: 'V50',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever Venus is increased, gain 3 heat.', (eb) => {
            eb.venus(1).startEffect.heat(3);
          });
        }),
      },
    });
  }

  public onGlobalParameterIncrease(player: IPlayer, parameter: GlobalParameter, steps: number) {
    if (parameter === GlobalParameter.VENUS) {
      player.stock.add(Resource.HEAT, 3 * steps, {log: true, from: {card: this}});
    }
  }
}
