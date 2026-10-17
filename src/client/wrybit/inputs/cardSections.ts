import type {CardModel} from '@/common/models/CardModel';
import type {Color} from '@/common/Color';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {SelectCardModel} from '@/common/models/PlayerInputModel';
import {ACTION_CARDS_TITLE, inactiveActionCards} from './actionCards';
import {draftedCardsInInput} from './draftCards';
import {titleKey} from './orOptionsShortLabels';

export type TrailingCardSection = {title: string, cards: ReadonlyArray<CardModel>, unavailable?: boolean, actionUsed?: boolean, cubeColor?: Color};
export type CardSections = {title?: string, trailing: ReadonlyArray<TrailingCardSection>};

export function selectCardSections(view: PlayerViewModel, input: SelectCardModel): CardSections {
  const kept = draftedCardsInInput(view, input);
  if (kept.length > 0) {
    return {trailing: [{title: 'Drafted cards', cards: kept}]};
  }
  if (input.selectBlueCardAction && !input.showOwner && titleKey(input.title) === ACTION_CARDS_TITLE) {
    const inactive = inactiveActionCards(view.thisPlayer, [input]);
    return {title: 'Action cards', trailing: [
      {title: 'Actions already used', cards: inactive.used, unavailable: true, actionUsed: true, cubeColor: view.thisPlayer.color},
      {title: 'Actions not usable', cards: inactive.unavailable, unavailable: true},
    ].filter((section) => section.cards.length > 0)};
  }
  return {trailing: []};
}
