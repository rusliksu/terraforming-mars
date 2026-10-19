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

export class IshtarEnergyNetwork extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.ISHTAR_ENERGY_NETWORK,
      tags: [Tag.VENUS, Tag.BUILDING],
      cost: 14,

      behavior: {
        global: {venus: 1},
        addResourcesToAnyCard: {type: CardResource.FLOATER, count: 1},
      },

      metadata: {
        cardNumber: 'V95',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.FLOATER, 1).nbsp.tile(TileType.VENUS_FLOATER_ARRAY, true).venus(1);
        }),
        description: 'Place a Floating Array on Venus and raise Venus 1 step. Add 1 floater to any card.',
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
