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

export class Suburbs extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SUBURBS,
      tags: [Tag.CITY, Tag.BUILDING],
      cost: 21,

      behavior: {
        production: {megacredits: 3},
      },

      metadata: {
        cardNumber: 'H01',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(3)).nbsp.tile(TileType.SUBURBS, true).asterix();
          b.br;
          b.plainText('Place the Suburbs tile on top of one of your greenery tiles. It counts as a city. Adjacency bonus: 1 M€.');
        }),
        description: 'Increase your M€ production 3 steps. Whoever places a tile adjacent to it gains 1 M€.',
      },
    });
  }

  private availableSpaces(player: IPlayer): Array<Space> {
    return player.game.board.spaces.filter((space) => Board.ownedBy(player)(space) && Board.isGreenerySpace(space));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.availableSpaces(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    return new SelectSpace(
      message('Select one of your greenery tiles to place ${0} on', (b) => b.card(this)),
      this.availableSpaces(player))
      .andThen((space) => {
        player.game.addTile(player, space, {
          tileType: TileType.SUBURBS,
          card: this.name,
          covers: space.tile,
        });
        return undefined;
      });
  }

  // Rob Antilles: "Adjacency bonus 1 M€" - implemented as a real, always-on bonus (not gated on
  // the Ares expansion, unlike the built-in AdjacencyBonus/AresHandler mechanic) that pays out to
  // whoever places a tile next to Suburbs, matching standard adjacency-bonus semantics.
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
