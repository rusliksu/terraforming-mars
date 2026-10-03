import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';
import {TileType} from '../../../common/TileType';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceFloaterArrayTile} from '../../venusPhase2/PlaceFloaterArrayTile';

export class AphroditeShuttleBase extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.APHRODITE_SHUTTLE_BASE,
      tags: [Tag.JOVIAN, Tag.SPACE],
      cost: 23,
      victoryPoints: 1,

      behavior: {
        global: {venus: 1},
        addResourcesToAnyCard: {type: CardResource.FLOATER, count: 3, tag: Tag.JOVIAN},
      },

      metadata: {
        cardNumber: 'V94',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.VENUS_FLOATER_ARRAY, true).venus(1).nbsp.resource(CardResource.FLOATER, 3).asterix();
        }),
        description: 'Place a Floating Array on Venus and raise Venus 1 step. Add 3 floaters to any one Jovian-tagged card.',
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
