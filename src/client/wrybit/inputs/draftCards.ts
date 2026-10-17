import type {CardModel} from '@/common/models/CardModel';
import type {CardName} from '@/common/cards/CardName';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {PlayerInputModel} from '@/common/models/PlayerInputModel';
import {toRaw} from 'vue';

const ORDER_PREFIX = 'wrybit:draft-card-order:';

/** The native actor flag identifies a draft, including optional repicks while waiting. */
export function isDraftInput(view: PlayerViewModel, input: PlayerInputModel | undefined = view.waitingFor): boolean {
  return view.thisPlayer.needsToDraft !== undefined && input?.type === 'card' && toRaw(input) === toRaw(view.waitingFor);
}

export function currentDraftPicks(view: PlayerViewModel, input: PlayerInputModel): ReadonlySet<CardName> {
  if (!isDraftInput(view, input) || input.type !== 'card' || input.optional !== true) {
    return new Set();
  }
  const offered = new Set(input.cards.map((card) => card.name));
  return new Set(view.draftedCards.filter((card) => offered.has(card.name)).map((card) => card.name));
}

export function draftedCardsInInput(view: PlayerViewModel, input: PlayerInputModel): ReadonlyArray<CardModel> {
  if (!isDraftInput(view, input)) {
    return [];
  }
  const current = currentDraftPicks(view, input);
  return view.draftedCards.filter((card) => !current.has(card.name));
}

export function showsDraftedCardsBlock(view: PlayerViewModel): boolean {
  return view.draftedCards.length > 0 && !isDraftInput(view);
}

/** Presentation order only; never reorder the native packet or a native selected-card array. */
export function keepDraftCardOrder<T extends CardModel>(playerId: string, cards: ReadonlyArray<T>): ReadonlyArray<T> {
  const names = cards.map((card) => card.name);
  let remembered: ReadonlyArray<string> | undefined;
  try {
    const raw = sessionStorage.getItem(ORDER_PREFIX + playerId);
    const stored: unknown = raw === null ? undefined : JSON.parse(raw);
    if (Array.isArray(stored) && stored.every((name) => typeof name === 'string') && new Set(stored).size === stored.length) {
      remembered = stored;
    }
  } catch {
    // Storage is optional; the native packet remains displayable.
  }
  if (remembered !== undefined && remembered.length === names.length && names.every((name) => remembered.includes(name))) {
    return [...cards].sort((first, second) => remembered.indexOf(first.name) - remembered.indexOf(second.name));
  }
  try {
    sessionStorage.setItem(ORDER_PREFIX + playerId, JSON.stringify(names));
  } catch {
    // The native order is the fallback when storage is unavailable.
  }
  return cards;
}
