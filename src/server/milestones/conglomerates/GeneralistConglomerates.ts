import {IMilestone} from '../IMilestone';
import {IPlayer} from '../../IPlayer';

const THRESHOLD_PER_RESOURCE = 2;

/**
 * Conglomerates' Generalist variant. The base Generalist ("have increased all 6 productions
 * by 1 step") is hard-capped at 6 by the number of production types that exist, so it can't
 * be scaled up like the other board milestones -- instead, this redefines it as a team check:
 * your team's COMBINED production of each of the 6 resources must be at least 2.
 */
export class GeneralistConglomerates implements IMilestone {
  public readonly name = 'Generalist2';
  public readonly description = `Your team has a combined production of at least ${THRESHOLD_PER_RESOURCE} in each of the 6 resources`;

  public getScore(player: IPlayer): number {
    const team = [player, ...player.teammates()];
    const combined = (get: (p: IPlayer) => number) => team.reduce((total, p) => total + get(p), 0);

    let score = 0;
    if (combined((p) => p.production.megacredits) >= THRESHOLD_PER_RESOURCE) {
      score++;
    }
    if (combined((p) => p.production.steel) >= THRESHOLD_PER_RESOURCE) {
      score++;
    }
    if (combined((p) => p.production.titanium) >= THRESHOLD_PER_RESOURCE) {
      score++;
    }
    if (combined((p) => p.production.plants) >= THRESHOLD_PER_RESOURCE) {
      score++;
    }
    if (combined((p) => p.production.energy) >= THRESHOLD_PER_RESOURCE) {
      score++;
    }
    if (combined((p) => p.production.heat) >= THRESHOLD_PER_RESOURCE) {
      score++;
    }
    return score;
  }

  public canClaim(player: IPlayer): boolean {
    return this.getScore(player) === 6;
  }
}
