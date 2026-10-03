import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {StandardProjectCard} from '../StandardProjectCard';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceCloudCityTile} from '../../venusPhase2/PlaceCloudCityTile';
import {Resource} from '../../../common/Resource';
import {StandardProjectCanPayWith} from '../../../common/cards/Types';
import {TileType} from '../../../common/TileType';
import {LogHelper} from '../../LogHelper';

export class CloudCityStandardProject extends StandardProjectCard {
  constructor(properties = {
    name: CardName.CLOUD_CITY_STANDARD_PROJECT,
    cost: 25,

    metadata: {
      cardNumber: '',
      renderData: CardRenderer.builder((b) =>
        b.standardProject('Spend 25 M€ (3 M€ off per floater spent) to place a Cloud City on Venus, raise your M€ production 1 step, and raise Venus 1 step.', (eb) => {
          eb.megacredits(25).startAction.tile(TileType.VENUS_CLOUD_CITY).production((pb) => pb.megacredits(1)).venus(1);
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
    player.game.defer(new PlaceCloudCityTile(player));
    player.production.add(Resource.MEGACREDITS, 1, {log: true});
    player.game.increaseVenusScaleLevel(player, 1);
    LogHelper.logVenusIncrease(player, 1);
  }
}
