import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {Space} from '../../boards/Space';
import {Board} from '../../boards/Board';
import {BoardType} from '../../boards/BoardType';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardRenderer} from '../render/CardRenderer';
import {message} from '../../logs/MessageBuilder';
import {oceans} from '../render/DynamicVictoryPoints';

export class HarborBorealis extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.HARBOR_BOREALIS,
      tags: [Tag.MARS, Tag.BUILDING],
      cost: 25,

      requirements: {oceans: 5},
      victoryPoints: 'special',

      metadata: {
        cardNumber: 'H02',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.HARBOR_BOREALIS, true).asterix().br;
          b.plainText('Place over an ocean tile adjacent to at least one city. Increase your M€ production 1 step ' +
            'for each ocean adjacent to this tile. Adjacency bonus: 1 steel.');
        }),
        description: 'Requires 5 oceans in play.',
        victoryPoints: oceans(1, 1),
      },
    });
  }

  private availableSpaces(player: IPlayer): Array<Space> {
    const board = player.game.board;
    return board.getOceanSpaces({upgradedOceans: false})
      .filter((space) => board.getAdjacentSpaces(space).some(Board.isCitySpace));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.availableSpaces(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    return new SelectSpace(
      message('Select an ocean adjacent to a city to place ${0} on', (b) => b.card(this)),
      this.availableSpaces(player))
      .andThen((space) => {
        const board = player.game.board;
        const adjacentOceans = board.getAdjacentSpaces(space).filter(Board.isOceanSpace).length;
        player.game.addTile(player, space, {
          tileType: TileType.HARBOR_BOREALIS,
          card: this.name,
          covers: space.tile,
        });
        if (adjacentOceans > 0) {
          player.production.add(Resource.MEGACREDITS, adjacentOceans, {log: true});
        }
        return undefined;
      });
  }

  public override getVictoryPoints(player: IPlayer): number {
    const mySpace = player.game.board.getSpaceByTileCard(this.name);
    if (mySpace === undefined) {
      return 0;
    }
    return player.game.board.getAdjacentSpaces(mySpace).filter(Board.isOceanSpace).length;
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
