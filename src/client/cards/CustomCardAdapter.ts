import {CardName} from '@/common/cards/CardName';
import {ClientCard} from '@/common/cards/ClientCard';
import {CustomCardModel} from '@/common/models/CardModel';

/**
 * Builds a `ClientCard`-shaped object from the wire-provided `CustomCardModel` fallback data
 * (`CardModel.customCard`, populated server-side in `cardsToModel()` for a Custom Card Maker
 * card -- see that function's doc comment). Used by `Card.vue` when `getCard(name)` misses the
 * client's compiled static manifest, which is always the case for a custom card, since it was
 * never baked into `cards.json` at build time.
 */
export function buildClientCardFromCustom(name: CardName, customCard: CustomCardModel): ClientCard {
  return {
    name,
    module: customCard.module,
    tags: customCard.tags,
    victoryPoints: undefined, // already inside metadata.victoryPoints, auto-populated server-side
    cost: customCard.cost,
    type: customCard.type,
    requirements: customCard.requirements,
    metadata: customCard.metadata,
    resourceType: customCard.resourceType,
    compatibility: customCard.compatibility,
    hasAction: false,
    hasEffect: false,
  };
}
