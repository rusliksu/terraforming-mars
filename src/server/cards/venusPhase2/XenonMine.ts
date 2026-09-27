import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {TileType} from '../../../common/TileType';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceGasMineTile} from '../../venusPhase2/PlaceGasMineTile';

export class XenonMine extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.XENON_MINE,
      tags: [Tag.VENUS, Tag.BUILDING],
      cost: 31,

      behavior: {
        global: {venus: 1},
        production: {heat: 3, megacredits: 2},
      },

      metadata: {
        cardNumber: 'V86',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.VENUS_GAS_MINE, true).venus(1).nbsp.production((pb) => pb.heat(3).megacredits(2));
        }),
        description: 'Place a Gas Mine on Venus and raise Venus 1 step. Increase your heat production 3 steps and your M€ production 2 steps.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const data = VenusPhase2Expansion.venusPhase2Data(player.game);
    return data.venusSurface.getAvailableSpacesForGaslight(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new PlaceGasMineTile(player));
    return undefined;
  }
}
