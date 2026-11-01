import {computed, inject} from 'vue';
import {INPUT_PRESENTATION_INTRO} from './presentation';

/** The permanent parent declares caption placement independently of refreshed DTO identities. */
export function useCardInputIntro() {
  const declared = inject(INPUT_PRESENTATION_INTRO, undefined);
  return computed(() => declared?.value === true);
}
