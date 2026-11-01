import {CardType} from '@/common/cards/CardType';
import type {CardModel} from '@/common/models/CardModel';
import type {PublicPlayerModel} from '@/common/models/PlayerModel';
import type {PlayerInputModel, SelectCardModel} from '@/common/models/PlayerInputModel';
import {getCard} from '@/client/cards/ClientCardManifest';
import {titleKey} from './orOptionsShortLabels';
import {sortActiveCards} from '@/client/utils/ActiveCardsSortingOrder';
import {sortCards} from '@/client/utils/SortOrder';
import {playedCardsSortOrder} from '@/client/wrybit/visuals/cardfilter/cardFilterState';

export const ACTION_CARDS_TITLE = 'Perform an action from a played card';
export const CEO_ACTION_TITLE = 'Use CEO once per game action';

export function actionOption(options: ReadonlyArray<PlayerInputModel>, title: string): number {
  return options.findIndex((option) => option.type === 'card' && option.min === 1 && option.max === 1 && titleKey(option.title) === title);
}

export function ownCeoCards(player: PublicPlayerModel): ReadonlyArray<CardModel> {
  return player.tableau.filter((card) => getCard(card.name)?.type === CardType.CEO);
}

export function orderActionCards(cards: ReadonlyArray<CardModel>): ReadonlyArray<CardModel> {
  const order = playedCardsSortOrder.value;
  return order === undefined ? sortActiveCards(cards) : sortCards(cards, order);
}

// The native server decides what is offered. This projection only groups the rest of our public tableau.
export function inactiveActionCards(player: PublicPlayerModel, options: ReadonlyArray<SelectCardModel>) {
  const offered = new Set(options.flatMap((option) => option.cards.filter((card) => !card.isDisabled).map((card) => card.name)));
  const used: CardModel[] = [];
  const unavailable: CardModel[] = [];
  for (const card of player.tableau) {
    const metadata = getCard(card.name);
    if (metadata === undefined || offered.has(card.name) || (!metadata.hasAction && metadata.type !== CardType.CEO)) {
      continue;
    }
    const isUsed = metadata.type === CardType.CEO ? card.isDisabled === true : player.actionsThisGeneration.includes(card.name);
    (isUsed ? used : unavailable).push(card);
  }
  return {used: orderActionCards(used), unavailable: orderActionCards(unavailable)};
}
