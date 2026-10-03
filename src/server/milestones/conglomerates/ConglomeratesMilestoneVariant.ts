import {IMilestone} from '../IMilestone';
import {IPlayer} from '../../IPlayer';
import {MilestoneName} from '../../../common/ma/MilestoneName';

/**
 * A Conglomerates-only milestone variant: delegates getScore/canClaim entirely to `base`
 * (whose canClaim already scales correctly for team play, see BaseMilestone.canClaim /
 * Terraformer.canClaim), but exposes its own name/description so the UI shows the real,
 * already-1.5x'd (rounded up) requirement instead of the unscaled base-game number. Swapped
 * in for the base milestone's board slot only when Conglomerates is on -- see
 * CONGLOMERATES_MILESTONE_MAP.
 */
export function conglomeratesVariant(name: MilestoneName, description: string, createBase: () => IMilestone): new () => IMilestone {
  return class ConglomeratesMilestoneVariant implements IMilestone {
    public readonly name = name;
    public readonly description = description;
    private readonly base = createBase();
    public getScore(player: IPlayer): number {
      return this.base.getScore(player);
    }
    public canClaim(player: IPlayer): boolean {
      return this.base.canClaim(player);
    }
  };
}
