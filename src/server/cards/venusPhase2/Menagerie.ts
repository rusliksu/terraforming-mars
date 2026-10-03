import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardResource} from '../../../common/CardResource';
import {TileType} from '../../../common/TileType';
import {Space} from '../../boards/Space';
import {Board} from '../../boards/Board';
import {BoardType} from '../../boards/BoardType';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardRenderer} from '../render/CardRenderer';
import {message} from '../../logs/MessageBuilder';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';

export class Menagerie extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MENAGERIE,
      tags: [Tag.ANIMAL, Tag.PLANT, Tag.BUILDING],
      cost: 21,
      requirements: {temperature: -10},

      metadata: {
        cardNumber: 'V66',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.MENAGERIE, true, false).asterix();
          b.br;
          b.plainText('Increase your M€ production and add 1 animal to any card for each greenery tile adjacent to Menagerie. Adjacency bonus: 1 animal to any card.', true);
        }),
        description: 'Requires -10 C or warmer.',
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
          tileType: TileType.MENAGERIE,
          card: this.name,
          covers: space.tile,
        });
        const adjacentGreeneries = player.game.board.getAdjacentSpaces(space)
          .filter((adjacentSpace) => Board.isGreenerySpace(adjacentSpace)).length;
        if (adjacentGreeneries > 0) {
          player.production.add(Resource.MEGACREDITS, adjacentGreeneries, {log: true});
          player.game.defer(new AddResourcesToCard(player, CardResource.ANIMAL, {count: adjacentGreeneries}));
        }
        return undefined;
      });
  }

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
    activePlayer.game.defer(new AddResourcesToCard(activePlayer, CardResource.ANIMAL, {count: 1}));
  }
}
