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

export class CoolingPillars extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.COOLING_PILLARS,
      tags: [Tag.VENUS, Tag.POWER, Tag.BUILDING],
      cost: 18,

      behavior: {
        global: {venus: 1},
        production: {energy: 1},
      },

      metadata: {
        cardNumber: 'V63',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(1)).nbsp.tile(TileType.VENUS_FLOATER_ARRAY, true).venus(1);
        }),
        description: 'Increase your energy production 1 step. Place a Floating Array on Venus and raise Venus 1 step.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const data = VenusPhase2Expansion.venusPhase2Data(player.game);
    return data.venusSurface.getAvailableSpacesForLand(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new PlaceFloaterArrayTile(player));
    return undefined;
  }
}
