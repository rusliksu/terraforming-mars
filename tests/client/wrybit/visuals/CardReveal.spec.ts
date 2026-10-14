import {expect} from 'chai';
import {vi} from 'vitest';
import {revealWhenLoaded} from '@/client/wrybit/visuals/cardlist/cardReveal';

describe('Wrybit card reveal lifecycle', () => {
  it('does not animate departed cards and clears the image timeout when loading finishes', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('getComputedStyle', () => ({backgroundImage: 'none'}));
    vi.stubGlobal('matchMedia', () => ({matches: false}));
    const element = document.createElement('div');
    let active = true;
    try {
      const reveal = revealWhenLoaded(element, () => active);
      active = false;
      await vi.advanceTimersByTimeAsync(20);
      await reveal;
      expect(element.style.getPropertyValue('--wrybit-reveal-delay')).eq('');
      expect(element.classList.contains('card-reveal-in')).is.false;
      expect(vi.getTimerCount()).eq(0);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
