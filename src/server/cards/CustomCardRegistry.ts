import type {DataDrivenCard} from './DataDrivenCard';
import type {ICard} from './ICard';
import {Database} from '../database/Database';
import {CardName} from '../../common/cards/CardName';
import {CustomCardDefinition} from '../../common/cards/CustomCardDefinition';

/**
 * A global, boot-loaded, in-memory registry of every *approved* custom card, refreshed whenever
 * an admin approves/deletes/edits one (see ApiCustomCardLibraryReview.ts). This is ambient global
 * state exactly like `ALL_MODULE_MANIFESTS` already is -- not threaded through `GameOptions`
 * per-game, since there's no per-game curation requirement (it's one shared library, like the Map
 * Library).
 *
 * Two things consult this registry:
 * - `createCard.ts`'s `_createCard()` -- a fallback after the `ALL_MODULE_MANIFESTS` scan, used
 *   for new-game included-card lookups and legacy name-only saves. New saves embed
 *   dynamic definitions, so later library edits cannot change an existing game.
 * - `GameCards.ts` -- adds every entry (subject to the "Custom Cards" toggle and per-card
 *   expansion-compatibility gating) to a *new* game's pool.
 */
const registry = new Map<CardName, CustomCardDefinition>();

export function getCustomCardDefinition(name: CardName): CustomCardDefinition | undefined {
  return registry.get(name);
}

export function isCustomCardName(name: CardName): boolean {
  return registry.has(name);
}

export function getAllCustomCardDefinitions(): ReadonlyArray<CustomCardDefinition> {
  return [...registry.values()];
}

export async function refreshCustomCardRegistry(): Promise<void> {
  const entries = await Database.getInstance().listCustomCardLibraryEntries();
  registry.clear();
  for (const entry of entries) {
    if (entry.status === 'approved') {
      registry.set(entry.definition.cardName as unknown as CardName, entry.definition);
    }
  }
}

/** Structural guard avoids a Card/ModelUtils initialization cycle. */
export function isDataDrivenCard(card: ICard): card is DataDrivenCard {
  return 'definition' in card;
}
