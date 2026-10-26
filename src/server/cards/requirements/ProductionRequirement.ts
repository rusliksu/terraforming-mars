import {Resource} from '../../../common/Resource';
import {IPlayer} from '../../IPlayer';
import {InequalityRequirement} from './InequalityRequirement';
import {Options} from './CardRequirement';
import {RequirementType} from '../../../common/cards/RequirementType';
import {CardName} from '../../../common/cards/CardName';

/**
 * Evaluate whether a player's resource production is at least (or at most) a given value.
 *
 * (e.g. player has 1 steel production.)
 */
export class ProductionRequirement extends InequalityRequirement {
  public readonly type = RequirementType.PRODUCTION;
  public readonly resource: Resource;
  constructor(resource: Resource, options?: Partial<Options>) {
    super(options);
    this.resource = resource;
  }
  public getScore(player: IPlayer): number {
    // Sistemas Seebeck (fan): energy and heat production are one combined pool.
    if ((this.resource === Resource.ENERGY || this.resource === Resource.HEAT) &&
      player.tableau.has(CardName.SISTEMAS_SEEBECK)) {
      return player.production.energy + player.production.heat;
    }
    return player.production[this.resource];
  }
}
