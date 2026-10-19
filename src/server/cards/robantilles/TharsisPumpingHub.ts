import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {TileType} from '../../../common/TileType';
import {SpaceBonus} from '../../../common/boards/SpaceBonus';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {Card} from '../Card';
import {Board} from '../../boards/Board';
import {Space} from '../../boards/Space';
import {PlaceTile} from '../../deferredActions/PlaceTile';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {message} from '../../logs/MessageBuilder';

export class TharsisPumpingHub extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.THARSIS_PUMPING_HUB,
      tags: [Tag.POWER, Tag.MARS, Tag.BUILDING],
      cost: 10,

      requirements: {oceans: 3},

      behavior: {
        production: {energy: 1},
      },

      metadata: {
        cardNumber: 'H46',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.energy(1)).tile(TileType.PUMPING_HUB, true).asterix();
          b.br;
          b.text('EFFECT: DURING PRODUCTION, YOU MAY KEEP UP TO 4 ENERGY RESOURCES INSTEAD OF CONVERTING THEM TO HEAT.', {size: Size.SMALL});
        }),
        description: 'Requires 3 ocean tiles. Increase your energy production 1 step. Place the Pumping Hub tile ADJACENT TO an ocean tile, ' +
          'which grants an ADJACENCY BONUS of 2 energy.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer, canAffordOptions: CanAffordOptions): boolean {
    return this.getAvailableSpaces(player, canAffordOptions).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(
      new PlaceTile(player, {
        tile: {tileType: TileType.PUMPING_HUB, card: this.name},
        on: () => this.getAvailableSpaces(player),
        title: message('Select space for ${0}', (b) => b.card(this)),
        adjacencyBonus: {bonus: [SpaceBonus.ENERGY, SpaceBonus.ENERGY]},
      }));
    return undefined;
  }

  private getAvailableSpaces(player: IPlayer, canAffordOptions?: CanAffordOptions): Array<Space> {
    return player.game.board.getAvailableSpacesOnLand(player, canAffordOptions)
      .filter(
        (space) => player.game.board.getAdjacentSpaces(space).filter(
          (adjacentSpace) => Board.isOceanSpace(adjacentSpace),
        ).length > 0,
      );
  }
}
