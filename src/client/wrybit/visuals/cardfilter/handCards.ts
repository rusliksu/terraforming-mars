import {PlayerViewModel} from '@/common/models/PlayerModel';
import {CardModel} from '@/common/models/CardModel';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {PlayerInputModel, SelectProjectCardToPlayModel} from '@/common/models/PlayerInputModel';
import {getCardsByType} from '@/client/utils/CardUtils';
import {sortActiveCards} from '@/client/utils/ActiveCardsSortingOrder';
import {isActiveCard} from '@/client/cards/CardModelMetadata';

export function allCardsInHand(view: PlayerViewModel): Array<CardModel> {
  return [...view.preludeCardsInHand, ...view.ceoCardsInHand, ...view.cardsInHand];
}

export function ownActiveCards(view: PlayerViewModel): ReadonlyArray<CardModel> {
  return sortActiveCards(getCardsByType(view.thisPlayer.tableau, [CardType.ACTIVE, CardType.PRELUDE]).filter(isActiveCard));
}

export function ownPlayedCardsWithoutActive(view: PlayerViewModel): ReadonlyArray<CardModel> {
  const active = new Set(ownActiveCards(view).map((card) => card.name));
  return view.thisPlayer.tableau.filter((card) => !active.has(card.name));
}

function findProjectCardInput(input: PlayerInputModel | undefined): SelectProjectCardToPlayModel | undefined {
  if (input?.type === 'projectCard') {
    return input;
  }
  if (input?.type === 'or' || input?.type === 'and') {
    for (const option of input.options) {
      const found = findProjectCardInput(option);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
}

/** Availability is a projection of our offered input; no local canPlay/payment calculation. */
export function playableProjectCards(view: PlayerViewModel): ReadonlySet<CardName> | undefined {
  const input = findProjectCardInput(view.waitingFor);
  return input === undefined ? undefined : new Set(input.cards.filter((card) => card.isDisabled !== true).map((card) => card.name));
}
