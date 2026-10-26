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
import {CardRenderItem} from '../render/CardRenderItem';
import {CardRenderItemType} from '../../../common/cards/render/CardRenderItemType';

export class ParadiseCity extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.PARADISE_CITY,
      tags: [Tag.CITY, Tag.PLANT],
      cost: 20,

      victoryPoints: 'special',

      metadata: {
        cardNumber: 'H07',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.PARADISE_CITY).asterix().br;
          b.plainText('Requires that you own a city adjacent to an ocean. Replace it with the Paradise City tile. ' +
            'It counts as a city. Adjacency bonus: 1 M€.');
        }),
        victoryPoints: {item: new CardRenderItem(CardRenderItemType.GREENERY, 1), points: 1, target: 1, asterisk: true},
      },
    });
  }

  private availableSpaces(player: IPlayer): Array<Space> {
    const board = player.game.board;
    return board.spaces.filter((space) => Board.ownedBy(player)(space) && Board.isCitySpace(space))
      .filter((space) => board.getAdjacentSpaces(space).some(Board.isOceanSpace));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.availableSpaces(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    return new SelectSpace(
      message('Select one of your city tiles adjacent to an ocean to replace with ${0}', (b) => b.card(this)),
      this.availableSpaces(player))
      .andThen((space) => {
        player.game.addTile(player, space, {
          tileType: TileType.PARADISE_CITY,
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
    return player.game.board.getAdjacentSpaces(mySpace).filter(Board.isGreenerySpace).length;
  }

  // Rob Antilles: "Adjacency bonus 1 M€" - see Suburbs.ts for why this is a bespoke, always-on
  // hook rather than the built-in (Ares-only) AdjacencyBonus mechanism.
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
    activePlayer.stock.add(Resource.MEGACREDITS, 1, {log: true, from: {card: this}});
  }
}
