import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {CardName} from '@/common/cards/CardName';
import {ConditionalDiscountModel} from '@/common/models/ConditionalDiscountModel';

export type DiscountSource = {source: CardName; amount: number; appliesTo: string};

const CONDITION_LABELS: Record<ConditionalDiscountModel['condition'], string> = {
  requirements: 'cards with requirements',
  spaceWithoutPlanetaryTags: 'space cards without planetary tags',
};

/** Format our public projection; do not infer amounts from card names, counters or private hands. */
export function getConditionalDiscounts(player: PublicPlayerModel): Array<DiscountSource> {
  return (player.conditionalDiscounts ?? []).map((discount) => ({source: discount.source, amount: discount.amount,
    appliesTo: CONDITION_LABELS[discount.condition]}));
}
