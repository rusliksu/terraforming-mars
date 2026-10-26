import {DynamicCardState} from '../SerializedCard';
import {CardName} from '../../common/cards/CardName';

export type SerializedDeck = {
  drawPileState?: Array<DynamicCardState>;
  discardPileState?: Array<DynamicCardState>;
  drawPile: Array<CardName>;
  discardPile: Array<CardName>;
}
