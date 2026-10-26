import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {Board} from '../../boards/Board';
import {MarsBoard} from '../../boards/MarsBoard';
import {PlaceCityTile} from '../../deferredActions/PlaceCityTile';
import {LoseProduction} from '../../deferredActions/LoseProduction';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';
import {Units} from '../../../common/Units';

export class Slums extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SLUMS,
      tags: [Tag.CITY, Tag.BUILDING],
      cost: 5,
      victoryPoints: -1,

      requirements: {cities: 4, all},

      metadata: {
        cardNumber: 'X80',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().megacredits(1).br;
            pb.minus().energy(1);
          }).nbsp.city().asterix();
        }),
        description: 'Requires 4 cities in play. Decrease your M€ production 1 step and your energy production 1 step. ' +
          'Place a city tile ADJACENT TO ANOTHER CITY TILE.',
      },
    });
  }

  public productionBox() {
    return Units.of({megacredits: -1, energy: -1});
  }

  private getAvailableSpaces(player: IPlayer, canAffordOptions?: CanAffordOptions): ReadonlyArray<Space> {
    return player.game.board.getAvailableSpacesOnLand(player, canAffordOptions)
      .filter((space) => player.game.board.getAdjacentSpaces(space).some((adjacentSpace) => Board.isCitySpace(adjacentSpace)));
  }

  public override bespokeCanPlay(player: IPlayer, canAffordOptions: CanAffordOptions): boolean {
    const available = this.getAvailableSpaces(player, canAffordOptions);
    if (available.length === 0) {
      return false;
    }
    return MarsBoard.hasEnergyCoverage(player, available);
  }

  public override bespokePlay(player: IPlayer) {
    const spaces = MarsBoard.filterForEnergy(player, this.getAvailableSpaces(player));
    player.production.add(Resource.MEGACREDITS, -1, {log: true});
    player.game.defer(new PlaceCityTile(player, {
      title: 'Select space adjacent to another city tile',
      spaces,
    })).andThen(() => {
      player.game.defer(new LoseProduction(player, Resource.ENERGY, {count: 1}));
    });
    return undefined;
  }
}
