import {reactive} from 'vue';
import {CardModel} from '@/common/models/CardModel';
import {CardOrderStorage} from '@/client/utils/CardOrderStorage';
import {SortOrder, sortCards} from '@/client/utils/SortOrder';

type CardOrder = ReturnType<typeof CardOrderStorage.getCardOrder>;
type HandSortState = {sortOrder: SortOrder | undefined, revision: number, manualOrder: CardOrder | undefined};
const viewers = new Map<string, HandSortState>();

export function handSortState(playerId: string): HandSortState {
  let state = viewers.get(playerId);
  if (state === undefined) {
    state = reactive({sortOrder: undefined, revision: 0, manualOrder: undefined});
    viewers.set(playerId, state);
  }
  return state;
}

/** Sort the whole hand with our comparator; Manual restores its previous order and appends new cards. */
export function sortHand(playerId: string, cards: ReadonlyArray<CardModel>, sortOrder: SortOrder | undefined): void {
  const state = handSortState(playerId);
  const stored = CardOrderStorage.getCardOrder(playerId);
  const ordered = CardOrderStorage.getOrdered(stored, cards);
  let names: ReadonlyArray<CardModel> = ordered;
  if (sortOrder !== undefined) {
    if (state.sortOrder === undefined) {
      const manualOrder = {...stored};
      ordered.forEach((card, index) => manualOrder[card.name] = index + 1);
      state.manualOrder = manualOrder;
    }
    names = sortCards(ordered, sortOrder);
  } else if (state.manualOrder !== undefined) {
    names = CardOrderStorage.getOrdered(state.manualOrder, ordered);
    state.manualOrder = undefined;
  }
  const order: CardOrder = {...stored};
  names.forEach((card, index) => order[card.name] = index + 1);
  CardOrderStorage.updateCardOrder(playerId, order);
  state.sortOrder = sortOrder;
  state.revision++;
}

/** The pointer sorter has already written our storage before emitting this notification. */
export function handReordered(playerId: string): void {
  const state = handSortState(playerId);
  state.sortOrder = undefined;
  state.manualOrder = undefined;
  state.revision++;
}

export function resetHandSort(playerId: string): void {
  viewers.delete(playerId);
}
