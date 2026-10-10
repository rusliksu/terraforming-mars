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
  const replacements = new Map<CardName, Array<CardName>>();
  for (const manifest of manifests) {
    for (const name of manifest.cardsToRemove) {
      removedNames.add(name);
    }
    for (const [original, replacement] of manifest.conditionalCardsToRemove) {
      const targets = replacements.get(original) ?? [];
      targets.push(replacement);
      replacements.set(original, targets);
    }
  }
  const hasAvailableReplacement = (name: CardName, visited: Set<CardName>): boolean => {
    for (const replacement of replacements.get(name) ?? []) {
      if (visited.has(replacement)) {
        continue;
      }
      if (presentNames.has(replacement) && !removedNames.has(replacement)) {
        return true;
      }
      if (hasAvailableReplacement(replacement, new Set([...visited, replacement]))) {
        return true;
      }
    }
    return false;
  };
  for (const name of replacements.keys()) {
    if (hasAvailableReplacement(name, new Set([name]))) {
      removedNames.add(name);
    }
  }
  return cards.filter((card) => !removedNames.has(card.name));
}
