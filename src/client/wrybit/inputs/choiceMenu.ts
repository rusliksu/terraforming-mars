import type {OrOptionsModel} from '@/common/models/PlayerInputModel';
import {isEndTab} from './orOptionsShortLabels';

export const INLINE_INPUT_TYPES = ['card', 'amount', 'resource'] as const;

export function isChoiceMenu(input: OrOptionsModel): boolean {
  return input.options.length > 0 && input.options.filter((option) => option.type === 'player').length <= 1 &&
    input.options.every((option) => (option.type === 'option' && !isEndTab(option.title)) || option.type === 'player' ||
      (INLINE_INPUT_TYPES as ReadonlyArray<string>).includes(option.type)) &&
    // Top-level played-card/CEO menus retain their Actions tab and selection controls.
    !input.options.some((option) => option.type === 'card' && option.selectBlueCardAction);
}
