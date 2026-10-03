import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {StandardProjectCard} from '../StandardProjectCard';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceGasMineTile} from '../../venusPhase2/PlaceGasMineTile';
import {Resource} from '../../../common/Resource';
import {StandardProjectCanPayWith} from '../../../common/cards/Types';
import {TileType} from '../../../common/TileType';
import {LogHelper} from '../../LogHelper';

export class GasMineStandardProject extends StandardProjectCard {
  constructor(properties = {
    name: CardName.GAS_MINE_STANDARD_PROJECT,
    cost: 21,

    metadata: {
      cardNumber: '',
      renderData: CardRenderer.builder((b) =>
        b.standardProject('Spend 21 M€ (3 M€ off per floater spent) to place a Gas Mine on a Venus gaslight space, raise heat production 1 step, and raise Venus 1 step.', (eb) => {
          eb.megacredits(21).startAction.tile(TileType.VENUS_GAS_MINE).production((pb) => pb.heat(1)).venus(1);
        }),
      ),
    },
  }) {
    super(properties);
  }

  public override canAct(player: IPlayer): boolean {
    const data = VenusPhase2Expansion.venusPhase2Data(player.game);
    if (data.venusSurface.getAvailableSpacesForGaslight(player).length === 0) {
      return false;
    }
    if (player.game.getVenusScaleLevel() >= player.game.parameters.venus.max) {
      this.addWarning('maxvenus');
    }
    return super.canAct(player);
  }

  public override canPayWith(): StandardProjectCanPayWith {
    return {anyFloaters: true};
  }

  actionEssence(player: IPlayer): void {
    player.game.defer(new PlaceGasMineTile(player));
    player.production.add(Resource.HEAT, 1, {log: true});
    player.game.increaseVenusScaleLevel(player, 1);
    LogHelper.logVenusIncrease(player, 1);
  }
}
