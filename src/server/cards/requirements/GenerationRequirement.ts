import {InequalityRequirement} from '@/server/cards/requirements/InequalityRequirement';
import {RequirementType} from '@/common/cards/RequirementType';
import {IPlayer} from '@/server/IPlayer';

/** A generation limit independent of global parameter requirement bonuses. */
export class GenerationRequirement extends InequalityRequirement {
  public readonly type = RequirementType.GENERATION;

  public getScore(player: IPlayer): number {
    return player.game.generation;
  }
}
