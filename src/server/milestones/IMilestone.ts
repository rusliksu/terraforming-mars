import {MilestoneName} from '../../common/ma/MilestoneName';
import {IPlayer} from '../IPlayer';
import {ConglomeratesExpansion} from '../conglomerates/ConglomeratesExpansion';

export interface IMilestone {
  name: MilestoneName;
  description: string;
  canClaim(player: IPlayer): boolean;
  getScore(player: IPlayer): number;
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

  public abstract getScore(player: IPlayer): number;
  public canClaim(player: IPlayer): boolean {
    return ConglomeratesExpansion.meetsTeamThreshold(player, this.threshold, (p) => this.getScore(p));
  }
}
