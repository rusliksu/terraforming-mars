import type {PlayerInputModel} from '@/common/models/PlayerInputModel';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import {Phase} from '@/common/Phase';
import {isChoiceMenu} from './choiceMenu';

export function hasWaitingForTabs(input: PlayerInputModel | undefined): boolean {
  return input !== undefined && input.type !== 'initialCards' && (input.type !== 'or' || isChoiceMenu(input));
}

export function initialDraftDealtSections(view: PlayerViewModel) {
  return view.game.phase !== Phase.INITIALDRAFTING || !view.game.gameOptions.initialDraftVariant ? [] : [
    {title: 'Corporations', cards: view.dealtCorporationCards},
    {title: 'Prelude cards', cards: view.dealtPreludeCards},
    {title: 'CEOs', cards: view.dealtCeoCards},
    {title: 'Project cards', cards: view.dealtProjectCards},
  ].filter((section) => section.cards.length > 0);
}
