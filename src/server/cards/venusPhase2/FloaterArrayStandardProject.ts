import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {StandardProjectCard} from '../StandardProjectCard';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceFloaterArrayTile} from '../../venusPhase2/PlaceFloaterArrayTile';
import {StandardProjectCanPayWith} from '../../../common/cards/Types';
import {TileType} from '../../../common/TileType';
import {LogHelper} from '../../LogHelper';

export class FloaterArrayStandardProject extends StandardProjectCard {
  constructor(properties = {
    name: CardName.FLOATER_ARRAY_STANDARD_PROJECT,
    cost: 19,

    metadata: {
      cardNumber: '',
      renderData: CardRenderer.builder((b) =>
        b.standardProject('Spend 19 M€ (3 M€ off per floater spent) to place a Floater Array on Venus and raise Venus 1 step. Adjacent Gas Mines/Cloud Cities score 1 VP each at game end.', (eb) => {
          eb.megacredits(19).startAction.tile(TileType.VENUS_FLOATER_ARRAY).venus(1);
        }),
      ),
    },
  }) {
    super(properties);
  }

  public override canAct(player: IPlayer): boolean {
    const data = VenusPhase2Expansion.venusPhase2Data(player.game);
    if (data.venusSurface.getAvailableSpacesForLand(player).length === 0) {
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
    player.game.defer(new PlaceFloaterArrayTile(player));
    player.game.increaseVenusScaleLevel(player, 1);
    LogHelper.logVenusIncrease(player, 1);
  }
}
