import {AWARD_COSTS, MAX_MILESTONES, MILESTONE_COST} from '@/common/constants';

/** General slot-price hints already used by the canonical panels. */
export function availableMilestonePrices(claimedCount: number, conglomerates: boolean): Array<number> {
  const cost = conglomerates ? Math.ceil(MILESTONE_COST * 1.5) : MILESTONE_COST;
  return Array(Math.max(0, MAX_MILESTONES - claimedCount)).fill(cost);
}

export function availableAwardPrices(fundedCount: number, conglomerates: boolean): Array<number> {
  const costs = conglomerates ? AWARD_COSTS.map((cost) => cost + 4) : AWARD_COSTS;
  return costs.slice(fundedCount);
}
