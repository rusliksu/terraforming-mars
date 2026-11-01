import {MilestoneName} from '../../common/ma/MilestoneName';
import {IPlayer} from '../IPlayer';
import {IGame} from '../IGame';
import {ConglomeratesExpansion} from '../conglomerates/ConglomeratesExpansion';
import {IMarsBot} from '@/server/automa/MarsBotCorpTypes';

export interface IMilestone {
  name: MilestoneName;
  description: string;
  canClaim(player: IPlayer): boolean;
  getScore(player: IPlayer): number;
  /** Threshold that applies in this game, when it is dynamic. */
  thresholdFor?(game: IGame): number | undefined;
  /**
   * Whether MarsBot meets the criteria.
   *
   * Only for milestones where the automa rules differ from `canClaim` for MarsBot's player.
   */
  marsBotCanClaim?(bot: IMarsBot): boolean;
}

export abstract class BaseMilestone implements IMilestone {
  public readonly name: MilestoneName;
  public readonly description: string;
  public readonly threshold: number;

  constructor(name: MilestoneName, description: string, threshold: number) {
    this.name = name;
    this.description = description;
    this.threshold = threshold;
  }

  public thresholdFor(_game: IGame): number {
    return this.threshold;
  }

  public abstract getScore(player: IPlayer): number;
  public canClaim(player: IPlayer): boolean {
    return ConglomeratesExpansion.meetsTeamThreshold(player, this.threshold, (p) => this.getScore(p));
  }
}
