import {StandardActionCard} from '../../StandardActionCard';
import {CardName} from '../../../../common/cards/CardName';
import {CardRenderer} from '../../render/CardRenderer';
import {IPlayer} from '../../../IPlayer';
import {Units} from '../../../../common/Units';


export class ConvertHeat extends StandardActionCard {
  constructor() {
    super({
      name: CardName.CONVERT_HEAT,
      metadata: {
        cardNumber: 'SA2',
        renderData: CardRenderer.builder((b) =>
          b.standardProject('Spend 8 heat to raise temperature 1 step.', (eb) => {
            eb.heat(8).startAction.temperature(1);
          }),
        ),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    const heatForTemperature = player.game.parameters.heatForTemperature;
    if (player.game.getTemperature() === player.game.parameters.temperature.max) {
      this.addWarning('maxtemp');
    }

    // Strictly speaking, this conditional is not necessary, because canAfford manages reserveUnits.
    if (player.availableHeat() < heatForTemperature) {
      return false;
    }

    return player.canAfford({
      cost: 0,
      tr: {temperature: 1},
      reserveUnits: Units.of({heat: heatForTemperature}),
    });
  }

  public action(player: IPlayer) {
    return player.spendHeat(player.game.parameters.heatForTemperature, () => {
      this.actionUsed(player);
      player.game.increaseTemperature(player, 1);
      return undefined;
    });
  }
}
