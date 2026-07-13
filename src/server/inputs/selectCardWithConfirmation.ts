import {Message} from '../../common/logs/Message';
import {ICard} from '../cards/ICard';
import {PlayerInput} from '../PlayerInput';
import {OrOptions} from './OrOptions';
import {SelectCard} from './SelectCard';
import {SelectOption} from './SelectOption';

export type CardSelectionConfirmation<T extends ICard> = {
  title(selected: ReadonlyArray<T>): string | Message,
  confirm(selected: ReadonlyArray<T>): PlayerInput | undefined,
  confirmWhen?(selected: ReadonlyArray<T>): boolean,
  dialogTitle?: string | Message,
  backTitle?: string | Message,
  confirmButtonLabel?: string,
};

/**
 * Keeps a card selection tentative until the player confirms it. Choosing Back
 * recreates the original input with the same card instances.
 */
export function selectCardWithConfirmation<T extends ICard>(
  createSelection: () => SelectCard<T>,
  confirmation: CardSelectionConfirmation<T>,
): SelectCard<T> {
  const selectCards = (): SelectCard<T> => createSelection()
    .andThen((selected) => {
      if (confirmation.confirmWhen?.(selected) === false) {
        return confirmation.confirm(selected);
      }

      return new OrOptions(
        new SelectOption(
          confirmation.title(selected),
          confirmation.confirmButtonLabel ?? 'Confirm',
        ).andThen(() => confirmation.confirm(selected)),
        new SelectOption(confirmation.backTitle ?? 'Choose another card', 'Back')
          .andThen(selectCards),
      )
        .setTitle(confirmation.dialogTitle ?? 'Confirm card selection')
        .setButtonLabel('Confirm');
    });

  return selectCards();
}
