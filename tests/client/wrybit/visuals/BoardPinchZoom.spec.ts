import {expect} from 'chai';
import {vi} from 'vitest';
import {attachPinchZoom} from '@/client/wrybit/visuals/board/boardPinchZoom';

describe('Wrybit board gesture ownership', () => {
  it('never turns cancelled scrolling or the tail of a pinch into a double tap', () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const element = document.createElement('div');
    const toggle = vi.fn();
    const zoomBy = vi.fn();
    const detach = attachPinchZoom(element, {toggle, zoomBy});
    const pointer = (type: string, pointerId: number, clientX = 10) => element.dispatchEvent(new PointerEvent(type,
      {pointerId, pointerType: 'touch', clientX, clientY: 10}));
    try {
      pointer('pointerdown', 1);
      pointer('pointercancel', 1);
      pointer('pointerdown', 2);
      pointer('pointerup', 2);
      expect(toggle.mock.calls).has.length(0);
      vi.setSystemTime(101_000);
      pointer('pointerdown', 3, 10);
      pointer('pointerdown', 4, 30);
      pointer('pointermove', 4, 40);
      expect(zoomBy.mock.calls).has.length(1);
      pointer('pointerup', 3, 10);
      pointer('pointerup', 4, 40);
      pointer('pointerdown', 5, 40);
      pointer('pointerup', 5, 40);
      expect(toggle.mock.calls).has.length(0);
      detach();
      pointer('pointerdown', 6);
      pointer('pointerup', 6);
      expect(toggle.mock.calls).has.length(0);
    } finally {
      detach();
      vi.useRealTimers();
    }
  });
});
