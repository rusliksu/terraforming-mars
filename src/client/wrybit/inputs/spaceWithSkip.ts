import type {PlayerInputModel, SelectOptionModel, SelectSpaceModel} from '@/common/models/PlayerInputModel';
import {titleKey} from './orOptionsShortLabels';

// Layout classification only; the native option retains its full text, index and effect.
const SKIP_TITLE = /^(skip\b|do not\b|don't\b|do nothing\b)/i;
export function spaceWithSkip(input: PlayerInputModel): {space: SelectSpaceModel, skips: ReadonlyArray<SelectOptionModel>} | undefined {
  if (input.type !== 'or') {
    return undefined;
  }
  const spaces = input.options.filter((option): option is SelectSpaceModel => option.type === 'space');
  const skips = input.options.filter((option): option is SelectOptionModel => option.type === 'option' && SKIP_TITLE.test(titleKey(option.title)));
  return spaces.length === 1 && skips.length > 0 && spaces.length + skips.length === input.options.length ? {space: spaces[0], skips} : undefined;
}
