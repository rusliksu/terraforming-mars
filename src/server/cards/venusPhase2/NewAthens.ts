import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceCloudCityTile} from '../../venusPhase2/PlaceCloudCityTile';
import {TileType} from '../../../common/TileType';

export class NewAthens extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.NEW_ATHENS,
      tags: [Tag.CITY, Tag.VENUS],
      cost: 19,
      requirements: {venus: 8},

      behavior: {
        global: {venus: 1},
        addResourcesToAnyCard: [
          {type: CardResource.SCIENCE, count: 1},
          {type: CardResource.FLOATER, count: 2},
        ],
      },

      metadata: {
        cardNumber: 'V89',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.SCIENCE, 1).resource(CardResource.FLOATER, 2).nbsp.tile(TileType.VENUS_CLOUD_CITY).venus(1);
        }),
        description: 'Requires Venus 8% or more. Add 1 science resource to any card and 2 floaters to any card. ' +
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
