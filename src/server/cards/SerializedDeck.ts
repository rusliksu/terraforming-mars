import {DynamicCardState} from '../SerializedCard';
import {CardName} from '../../common/cards/CardName';

export type SerializedDeck<N extends string = CardName> = {
  drawPileState?: Array<DynamicCardState>;
  discardPileState?: Array<DynamicCardState>;
  drawPile: Array<N>;
  discardPile: Array<N>;
}
