import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceCloudCityTile} from '../../venusPhase2/PlaceCloudCityTile';
import {TileType} from '../../../common/TileType';

export class NewAlexandria extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.NEW_ALEXANDRIA,
      tags: [Tag.CITY, Tag.VENUS],
      cost: 20,
      requirements: {venus: 6},

      behavior: {
        global: {venus: 1},
        production: {energy: -1, megacredits: 3},
      },

      metadata: {
        cardNumber: 'V74',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().energy(1).megacredits(3)).nbsp.tile(TileType.VENUS_CLOUD_CITY).venus(1);
        }),
        description: 'Requires Venus 6% or more. Decrease your energy production 1 step and increase your M€ production 3 steps. ' +
          'Place a Venus Habitat tile and raise Venus 1 step.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const data = VenusPhase2Expansion.venusPhase2Data(player.game);
    return data.venusSurface.getAvailableSpacesForLand(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new PlaceCloudCityTile(player, undefined, 'Select a space on the Venus surface for a Venus Habitat.'));
    return undefined;
  }
}
