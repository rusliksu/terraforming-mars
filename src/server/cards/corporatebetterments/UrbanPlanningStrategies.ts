import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Board} from '../../boards/Board';
import {all} from '../Options';

export class UrbanPlanningStrategies extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.URBAN_PLANNING_STRATEGIES,
      tags: [Tag.BUILDING],
      cost: 15,

      metadata: {
        cardNumber: 'B42',
        renderData: CardRenderer.builder((b) => {
          b.tr(2).slash().city().br;
          b.tr(1, {all}).slash().city({all});
        }),
        description: 'Increase your TR 2 steps for every city you own adjacent to at least 1 ocean tile and ' +
          '2 greenery tiles. Other players increase their TR 1 step for each city they own meeting the same condition.',
      },
    });
  }

  /* The number of `player`'s cities adjacent to at least 1 ocean tile and 2 greenery tiles. */
  private qualifyingCities(player: IPlayer): number {
    const board = player.game.board;
    return board.getCities(player).filter((city) => {
      const adjacent = board.getAdjacentSpaces(city);
      const hasOcean = adjacent.some((space) => Board.isOceanSpace(space));
      const greeneryCount = adjacent.filter((space) => Board.isGreenerySpace(space)).length;
      return hasOcean && greeneryCount >= 2;
    }).length;
  }

  public override bespokePlay(player: IPlayer) {
    const ownQualifyingCities = this.qualifyingCities(player);
    if (ownQualifyingCities > 0) {
      player.increaseTerraformRating(ownQualifyingCities * 2, {log: true});
    }

    for (const opponent of player.opponents) {
      const count = this.qualifyingCities(opponent);
      if (count > 0) {
        opponent.increaseTerraformRating(count, {log: true});
      }
    }
    return undefined;
  }
}
