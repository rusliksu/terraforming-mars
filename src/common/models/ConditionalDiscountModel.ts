import {CardName} from '../cards/CardName';

/** Public informational badges; these amounts do not determine a card's payable cost. */
export type ConditionalDiscountModel = {
  source: CardName;
  amount: number;
  condition: 'requirements' | 'spaceWithoutPlanetaryTags';
};
