import {CardName} from '../cards/CardName';

/**
 * High Orbit (fan): one of the 3 rows in the shared Infrastructure card market. Always 5 slots;
 * `undefined` means the slot is currently empty (its card was bought this generation, or -- in
 * the unlikely case the shared deck ran dry -- there was nothing left to deal into it).
 *
 * Buying any card in a row locks the whole row (see IGame.highOrbitMarket) for the rest of the
 * current generation, even though the row's other slots may still show cards.
 */
export type HighOrbitMarketRow = {
  locked: boolean;
  slots: Array<CardName | undefined>;
};
