import type {SerializedPlayer} from '../SerializedPlayer';

/** Restores a completed research purchase without rewinding other players. */
export interface ResearchPurchaseUndoState {
  playerSnapshot: SerializedPlayer;
  cardCount: number;
  cardsInHandStartIndex: number;
  projectDiscardStartIndex: number;
  generation: number;
  logStartIndex?: number;
  logEndIndex?: number;
}
