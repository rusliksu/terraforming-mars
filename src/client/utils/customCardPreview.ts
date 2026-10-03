import {CardModel, CustomCardModel} from '@/common/models/CardModel';
import {CardName} from '@/common/cards/CardName';
import {CustomCardDefinition} from '@/common/cards/CustomCardDefinition';

/** Turns a stored/submitted custom card definition into the `CardModel` shape `Card.vue`
 * needs to render it, the same conversion `CardMaker.vue`'s own live preview does from its
 * in-progress form fields (see its `previewCardModel`). Shared here so the Card Library's
 * review list renders every submission exactly as the maker previewed it. */
export function definitionToCardModel(definition: CustomCardDefinition): CardModel {
  const customCard: CustomCardModel = {
    type: definition.type,
    cost: definition.cost,
    tags: definition.tags,
    requirements: definition.requirements,
    metadata: {
      description: definition.description,
      renderData: definition.renderData,
      victoryPoints: definition.victoryPoints,
    },
    resourceType: definition.resourceType,
    module: 'customCards',
    compatibility: definition.compatibility,
  };
  return {
    name: definition.cardName as CardName,
    customCard,
  };
}
