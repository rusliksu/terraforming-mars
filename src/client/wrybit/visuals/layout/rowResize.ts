// Height of a card in the player view via a horizontal drag handle below it (RowResizeHandle.vue):
// players card on the left, Mars card on the right. What "height" means for the content (scale the player table,
// zoom Mars) is decided by the target; this module only handles dragging and limits.
import {ACTIVE_CLASS} from '@/client/wrybit/visuals/layout/handleProximity';

export type HeightLimits = {min: number; max: number};

export type RowResizeTarget = {
  // Rendered height of the card in px
  current(): number;
  limits(): HeightLimits;
  // Fixed height in px, or undefined for the default layout
  apply(height: number | undefined): void;
};

// Step size for the arrow keys on the handle in px
export const KEYBOARD_ROW_STEP = 10;

export const clampHeight = (height: number, limits: HeightLimits) =>
  Math.round(Math.min(limits.max, Math.max(limits.min, height)));

// Dragging with mouse, pen or finger: the card grows by the distance the pointer moved; onEnd gets the final height
export function startRowResize(event: PointerEvent, target: RowResizeTarget, onEnd: (height: number) => void): () => void {
  const handle = event.currentTarget as HTMLElement;
  handle.focus({preventScroll: true});
  handle.setPointerCapture(event.pointerId);
  handle.classList.add(ACTIVE_CLASS);
  // Don't select text while dragging
  event.preventDefault();
  const startY = event.clientY;
  const startHeight = target.current();
  const limits = target.limits();
  let height = clampHeight(startHeight, limits);

  let alive = true;
  const move = (moveEvent: PointerEvent) => {
    if (!alive || moveEvent.pointerId !== event.pointerId) {
      return;
    }
    height = clampHeight(startHeight + moveEvent.clientY - startY, limits);
    target.apply(height);
  };
  const cleanup = () => {
    if (!alive) {
      return;
    }
    alive = false;
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', stop);
    handle.removeEventListener('pointercancel', cancel);
    handle.classList.remove(ACTIVE_CLASS);
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
  };
  const stop = (endEvent: PointerEvent) => {
    if (!alive || endEvent.pointerId !== event.pointerId) {
      return;
    }
    cleanup();
    onEnd(height);
  };
  const cancel = (cancelEvent: PointerEvent) => {
    if (cancelEvent.pointerId === event.pointerId) {
      cleanup();
    }
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', cancel);
  return cleanup;
}
