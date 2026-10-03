import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {TileType} from '../../../common/TileType';
import {PlaceTile} from '../../deferredActions/PlaceTile';
import {Space} from '../../boards/Space';
import {CardName} from '../../../common/cards/CardName';
import {Board} from '../../boards/Board';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class Outskirts extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.OUTSKIRTS,
      tags: [Tag.CITY, Tag.BUILDING],
      cost: 14,
      requirements: {oxygen: 13},

      metadata: {
        cardNumber: 'V68',
        renderData: CardRenderer.builder((b) => {
          b.city().asterix();
        }),
        description: 'Requires 13% oxygen or more. Place a City tile adjacent to at least 1 other city tile. ' +
          'Decrease the energy production of the adjacent city\'s owner 1 step. Increase your M€ production 2 steps.',
      },
    });
  }

  private getAvailableSpaces(player: IPlayer, canAffordOptions?: CanAffordOptions): Array<Space> {
    return player.game.board.getAvailableSpacesOnLand(player, canAffordOptions)
      .filter((space) => player.game.board.getAdjacentSpaces(space).some((adjacentSpace) => Board.isCitySpace(adjacentSpace)));
  }

  public override bespokeCanPlay(player: IPlayer, canAffordOptions: CanAffordOptions): boolean {
    return this.getAvailableSpaces(player, canAffordOptions).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(
      new PlaceTile(player, {
        tile: {tileType: TileType.CITY, card: this.name},
        on: () => this.getAvailableSpaces(player),
        title: 'Select space adjacent to a city tile',
      }))
      .andThen((space) => {
        const adjacentCity = player.game.board.getAdjacentSpaces(space)
          .find((adjacentSpace) => Board.isCitySpace(adjacentSpace) && adjacentSpace.id !== space.id);
        if (adjacentCity?.player !== undefined) {
          adjacentCity.player.production.add(Resource.ENERGY, -1, {log: true});
        }
        player.production.add(Resource.MEGACREDITS, 2, {log: true});
      });
    return undefined;
  }
}
