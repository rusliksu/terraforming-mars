import {CardName} from '../../common/cards/CardName';
import {DynamicCardState} from '../SerializedCard';
import {cardsFromJSON} from '../createCard';
import {IProjectCard} from './IProjectCard';
import {isDataDrivenCard} from './CustomCardRegistry';
import {deserializeProjectCard, serializeProjectCard} from './cardSerialization';

/** Supplemental metadata keeps ordinary name-only saves unchanged. */
export function serializeDynamicCards(cards: ReadonlyArray<IProjectCard>): Array<DynamicCardState> | undefined {
  const states = cards.flatMap((card, index) => isDataDrivenCard(card) || card.name === CardName.DEIMOS_DOUBLE_DOWN_COPY ?
    [{index, card: serializeProjectCard(card)}] : []);
  return states.length === 0 ? undefined : states;
}

export function restoreDynamicCards(names: ReadonlyArray<CardName>, states?: ReadonlyArray<DynamicCardState>): Array<IProjectCard> {
  if (states === undefined) {
    return cardsFromJSON(names);
  }
  const byIndex = new Map(states.map((state) => [state.index, state.card]));
  return names.flatMap((name, index) => {
    const state = byIndex.get(index);
    if (state === undefined) {
      return cardsFromJSON([name]);
    }
    if (state.name !== name) {
      throw new Error('Dynamic card state does not match its position');
    }
    return [deserializeProjectCard(state)];
  });
}
