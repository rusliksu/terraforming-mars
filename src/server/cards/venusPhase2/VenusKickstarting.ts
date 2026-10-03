import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {TileType} from '../../../common/TileType';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceFloaterArrayTile} from '../../venusPhase2/PlaceFloaterArrayTile';

export class VenusKickstarting extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.VENUS_KICKSTARTING,
      tags: [Tag.VENUS],
      cost: 22,
      requirements: {venus: 16, max: true},

      metadata: {
        cardNumber: 'V78',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.VENUS_FLOATER_ARRAY, true).tile(TileType.VENUS_FLOATER_ARRAY, true);
        }),
        description: 'Requires Venus 16% or less. Place 2 Floating Array tiles on Venus.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const data = VenusPhase2Expansion.venusPhase2Data(player.game);
    return data.venusSurface.getAvailableSpacesForLand(player).length >= 2;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new PlaceFloaterArrayTile(player));
    player.game.defer(new PlaceFloaterArrayTile(player));
    return undefined;
  }
}
