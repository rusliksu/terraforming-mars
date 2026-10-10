import {CardName} from '@/common/cards/CardName';
import {GameModule} from '@/common/cards/GameModule';

export type CardReplacementRules = Readonly<{
  module: GameModule;
  cardsToRemove: Iterable<CardName>;
  conditionalCardsToRemove: Iterable<readonly [CardName, CardName]>;
}>;

/* Removes originals when enabled modules replace them in the available pool. */
export function filterReplacedCards<T extends {name: CardName}>(
  cards: ReadonlyArray<T>,
  manifests: ReadonlyArray<CardReplacementRules>,
): Array<T> {
  const presentNames = new Set(cards.map((card) => card.name));
  const removedNames = new Set<CardName>();
  for (const manifest of manifests) {
    for (const name of manifest.cardsToRemove) {
      removedNames.add(name);
    }
    for (const [original, replacement] of manifest.conditionalCardsToRemove) {
      if (presentNames.has(replacement)) {
        removedNames.add(original);
      }
    }
  }
  return cards.filter((card) => !removedNames.has(card.name));
}
