import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {MarsBoard} from '../../boards/MarsBoard';
import {PlaceCityTile} from '../../deferredActions/PlaceCityTile';
import {LoseProduction} from '../../deferredActions/LoseProduction';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Units} from '../../../common/Units';

export class LonelyTown extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.LONELY_TOWN,
      tags: [Tag.CITY, Tag.BUILDING],
      cost: 8,

      metadata: {
        cardNumber: 'X82',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => {
            pb.minus().energy(1).br;
            pb.plus().megacredits(3);
          }).nbsp.city().asterix();
        }),
        description: 'Decrease your energy production 1 step and increase your M€ production 3 steps. ' +
          'Place a city tile such that there are at least 2 empty spaces (or the edge of the map) in every direction.',
      },
    });
  }

  public productionBox() {
    return Units.of({energy: -1, megacredits: 3});
  }

  private getAvailableSpaces(player: IPlayer, canAffordOptions?: CanAffordOptions): ReadonlyArray<Space> {
    const board = player.game.board;
    return board.getAvailableIsolatedSpaces(player, canAffordOptions).filter((space) => {
      return board.getAdjacentSpaces(space).every((ring1) => {
        return board.getAdjacentSpaces(ring1).every((ring2) => ring2 === space || ring2.tile === undefined);
      });
    });
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
    player.game.defer(new PlaceCityTile(player, {
      title: 'Select space with 2 empty spaces in every direction',
      spaces,
    })).andThen(() => {
      player.production.add(Resource.MEGACREDITS, 3, {log: true});
      player.game.defer(new LoseProduction(player, Resource.ENERGY, {count: 1}));
      return undefined;
    });
    return undefined;
  }
}
