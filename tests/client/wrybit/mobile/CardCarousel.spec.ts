import {afterEach, describe, expect, it, vi} from 'vitest';
import {CarouselState, observeCardCarousel, scrollCarouselTo} from '@/client/wrybit/mobile/cardCarousel';

function rect(left: number, width: number): DOMRect {
  return {left, width, right: left + width, top: 0, height: 248, bottom: 248, x: left, y: 0, toJSON: () => ({})} as DOMRect;
}

function buildCarousel(): {root: HTMLElement, list: HTMLElement, labels: Array<HTMLElement>, radios: Array<HTMLInputElement>} {
  document.body.innerHTML = '<div class="mb-screen--turn"><div class="payments_cont"></div></div>';
  const root = document.querySelector<HTMLElement>('.mb-screen--turn') as HTMLElement;
  const list = root.querySelector<HTMLElement>('.payments_cont') as HTMLElement;
  const labels: Array<HTMLElement> = [];
  const radios: Array<HTMLInputElement> = [];
  for (let index = 0; index < 3; index++) {
    const label = document.createElement('label');
    label.className = 'payments_cards';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'carousel';
    label.appendChild(input);
    list.appendChild(label);
    labels.push(label);
    radios.push(input);
  }
  Object.defineProperty(list, 'offsetWidth', {configurable: true, value: 318});
  Object.defineProperty(list, 'clientWidth', {configurable: true, value: 318});
  list.getBoundingClientRect = () => rect(0, 318);
  labels.forEach((label, index) => {
    label.getBoundingClientRect = () => rect(35 + index * 318, 248);
  });
  return {root, list, labels, radios};
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('mobile card carousel', () => {
  it('selects the centered card on the initial layout instead of keeping an off-screen native choice', async () => {
    const {root, radios} = buildCarousel();
    radios[2].checked = true;
    const states: Array<CarouselState | undefined> = [];
    const stop = observeCardCarousel(root, (state) => states.push(state));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(states.at(-1)).toEqual({count: 3, index: 0, unavailable: [false, false, false]});
    expect(radios[0].checked).toBe(true);
    expect(radios[2].checked).toBe(false);
    stop();
  });

  it('selects the target card immediately when a dot is clicked', () => {
    const {root, radios} = buildCarousel();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    radios[0].checked = true;
    scrollCarouselTo(root, 1);

    expect(radios[1].checked).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
