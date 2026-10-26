import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {Space} from '../../boards/Space';
import {Board, isSpecialTileSpace} from '../../boards/Board';
import {BoardType} from '../../boards/BoardType';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardRenderer} from '../render/CardRenderer';
import {message} from '../../logs/MessageBuilder';
import {CardRenderItem} from '../render/CardRenderItem';
import {CardRenderItemType} from '../../../common/cards/render/CardRenderItemType';

export class IndustrialMetropolis extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.INDUSTRIAL_METROPOLIS,
      tags: [Tag.BUILDING],
      cost: 19,

      requirements: {cities: 1},
      victoryPoints: 'special',

      behavior: {
        production: {energy: -1, steel: 1},
      },

      metadata: {
        cardNumber: 'H04',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().energy(1).br;
            pb.plus().steel(1);
          }).nbsp.tile(TileType.INDUSTRIAL_METROPOLIS).asterix();
          b.br;
          b.plainText('Place on top of one of your cities. Adjacency bonus: 1 steel.');
        }),
        description: 'Requires that you own a city. Decrease your Energy production 1 step and increase your ' +
          'Steel production 1 step.',
        victoryPoints: {item: new CardRenderItem(CardRenderItemType.EMPTY_TILE_SPECIAL, 1), points: 1, target: 1, asterisk: true},
      },
    });
  }

  private availableSpaces(player: IPlayer): Array<Space> {
    return player.game.board.spaces.filter((space) => Board.ownedBy(player)(space) && Board.isCitySpace(space));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.availableSpaces(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    return new SelectSpace(
      message('Select one of your city tiles to place ${0} on', (b) => b.card(this)),
      this.availableSpaces(player))
      .andThen((space) => {
        player.game.addTile(player, space, {
          tileType: TileType.INDUSTRIAL_METROPOLIS,
          card: this.name,
          covers: space.tile,
        });
        return undefined;
      });
  }

  public override getVictoryPoints(player: IPlayer): number {
    const mySpace = player.game.board.getSpaceByTileCard(this.name);
    if (mySpace === undefined) {
      return 0;
    }
    return player.game.board.getAdjacentSpaces(mySpace).filter(isSpecialTileSpace).length;
  }

  // Rob Antilles: "Adjacency bonus 1 Steel" - see Suburbs.ts for why this is a bespoke,
  // always-on hook rather than the built-in (Ares-only) AdjacencyBonus mechanism.
  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space, boardType: BoardType): void {
    if (boardType !== BoardType.MARS) {
      return;
    }
    const mySpace = cardOwner.game.board.getSpaceByTileCard(this.name);
    if (mySpace === undefined || mySpace.id === space.id) {
      return;
    }
    if (!cardOwner.game.board.getAdjacentSpaces(mySpace).some((adjacent) => adjacent.id === space.id)) {
      return;
    }
    activePlayer.stock.add(Resource.STEEL, 1, {log: true, from: {card: this}});
  }
}
