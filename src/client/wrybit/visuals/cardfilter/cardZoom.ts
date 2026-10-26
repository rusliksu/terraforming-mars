import {reactive, watchEffect} from 'vue';
import {safeLocalStorage} from '@/client/utils/SafeLocalStorage';

export const CARD_ZOOM_MIN = 0.4;
export const CARD_ZOOM_MAX = 1.1;
export const CARD_ZOOM_DEFAULT = 1;
const STORAGE_KEY = 'wrybit.cardZoom';
const CSS_VARIABLE = '--wrybit-card-zoom';

function clamp(value: number): number {
  return Math.min(CARD_ZOOM_MAX, Math.max(CARD_ZOOM_MIN, value));
}

const saved = Number(safeLocalStorage.getItem(STORAGE_KEY));
export const cardZoomState = reactive({zoom: Number.isFinite(saved) && saved > 0 ? clamp(saved) : CARD_ZOOM_DEFAULT});

export function setCardZoom(zoom: number): void {
  if (!Number.isFinite(zoom)) {
    return;
  }
  cardZoomState.zoom = clamp(zoom);
  safeLocalStorage.setItem(STORAGE_KEY, String(cardZoomState.zoom));
}

const owners = new WeakMap<HTMLElement, {count: number, release: () => void}>();

/** Slider instances share one root binding; importing this module changes no document styles. */
export function attachCardZoom(root: HTMLElement): () => void {
  let owner = owners.get(root);
  if (owner === undefined) {
    const previous = root.style.getPropertyValue(CSS_VARIABLE);
    const stop = watchEffect(() => root.style.setProperty(CSS_VARIABLE, String(cardZoomState.zoom)), {flush: 'sync'});
    owner = {count: 0, release: () => {
      stop();
      if (previous === '') {
        root.style.removeProperty(CSS_VARIABLE);
      } else {
        root.style.setProperty(CSS_VARIABLE, previous);
      }
    }};
    owners.set(root, owner);
  }
  owner.count++;
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    if (--owner.count === 0) {
      owner.release();
      owners.delete(root);
    }
  };
}
