import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {Board} from '../../boards/Board';
import {Space} from '../../boards/Space';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

const MC_PER_CITY = 2;

/**
 * "Connected to at least one other city via Oceans" means a path of adjacent Ocean tiles linking
 * two City tiles. There's no existing pathfinding helper for this in Board.ts (only direct
 * adjacency helpers), so this walks the ocean network with a small bespoke search per city.
 */
export class MartianCommercialSeafleet extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MARTIAN_COMMERCIAL_SEAFLEET,
      tags: [Tag.BUILDING],
      cost: 18,

      requirements: {oceans: 3},

      action: {
        spend: {steel: 1},
      },

      metadata: {
        cardNumber: 'H53',
        renderData: CardRenderer.builder((b) => {
          b.action(undefined, (ab) => {
            ab.steel(1).startAction.city().slash().oceans(1).slash().city();
          }).br;
          b.text(
            'Spend 1 steel to gain 2 M€ for each city connected to at least one other city via a chain of ' +
            'adjacent ocean tiles.',
            {size: Size.SMALL});
        }),
        description: 'Requires 3 ocean tiles.',
      },
    });
  }

  public override bespokeCanAct(player: IPlayer): boolean {
    return player.steel > 0;
  }

  public override bespokeAction(player: IPlayer) {
    const board = player.game.board;
    const cities = board.getCities();
    const connected = cities.filter((city) => this.isOceanConnectedToAnotherCity(board, city));
    const gain = connected.length * MC_PER_CITY;
    if (gain > 0) {
      player.stock.add(Resource.MEGACREDITS, gain, {log: true});
      player.game.log(
        '${0} gained ${1} M€ from ${2} ocean-connected cities',
        (b) => b.player(player).number(gain).number(connected.length));
    } else {
      player.game.log('${0} found no ocean-connected cities', (b) => b.player(player));
    }
    return undefined;
  }

  private isOceanConnectedToAnotherCity(board: Board, city: Space): boolean {
    const visited = new Set<string>([city.id]);
    const stack: Array<Space> = board.getAdjacentSpaces(city).filter(Board.isOceanSpace);
    for (const oceanSpace of stack) {
      visited.add(oceanSpace.id);
    }
    while (stack.length > 0) {
      const ocean = stack.pop();
      if (ocean === undefined) {
        continue;
      }
      for (const adjacent of board.getAdjacentSpaces(ocean)) {
        if (visited.has(adjacent.id)) {
          continue;
        }
        if (Board.isCitySpace(adjacent)) {
          return true;
        }
        if (Board.isOceanSpace(adjacent)) {
          visited.add(adjacent.id);
          stack.push(adjacent);
        }
      }
    }
    return false;
  }
}
