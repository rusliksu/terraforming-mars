import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import HomeColumns from '@/client/wrybit/visuals/HomeColumns.vue';
import {observeBoardColumn, BOARD_COLUMN_LEFT_VARIABLE} from '@/client/wrybit/visuals/layout/boardColumnPosition';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit column ownership', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('keeps the replacement root position when an older root unmounts and restores the original value last', () => {
    const style = document.documentElement.style;
    style.setProperty(BOARD_COLUMN_LEFT_VARIABLE, '12px', 'important');
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);
    first.getBoundingClientRect = () => ({left: 100}) as DOMRect;
    second.getBoundingClientRect = () => ({left: 700}) as DOMRect;
    const stopFirst = observeBoardColumn(first);
    const stopSecond = observeBoardColumn(second);
    try {
      expect(style.getPropertyValue(BOARD_COLUMN_LEFT_VARIABLE)).eq('700px');
      stopFirst();
      window.dispatchEvent(new Event('resize'));
      expect(style.getPropertyValue(BOARD_COLUMN_LEFT_VARIABLE)).eq('700px');
      stopSecond();
      expect(style.getPropertyValue(BOARD_COLUMN_LEFT_VARIABLE)).eq('12px');
      expect(style.getPropertyPriority(BOARD_COLUMN_LEFT_VARIABLE)).eq('important');
    } finally {
      stopFirst();
      stopSecond();
      first.remove();
      second.remove();
      style.removeProperty(BOARD_COLUMN_LEFT_VARIABLE);
    }
  });

  it('stores only private dimensions, clamps invalid storage and resets through ordinary keyboard controls', async () => {
    localStorage.setItem('wrybit.player-home.board_share', 'Infinity');
    localStorage.setItem('player_home_board_share', '55');
    const wrapper = mount(HomeColumns, globalConfig);
    try {
      const handle = wrapper.get('[role="separator"]');
      expect(handle.attributes('aria-valuenow')).eq('40');
      await handle.trigger('keydown', {key: 'ArrowLeft'});
      expect(handle.attributes('aria-valuenow')).eq('41');
      expect(localStorage.getItem('wrybit.player-home.board_share')).eq('41');
      expect(localStorage.getItem('player_home_board_share')).eq('55');
      await handle.trigger('dblclick');
      expect(handle.attributes('aria-valuenow')).eq('40');
      expect(localStorage.getItem('wrybit.player-home.board_share')).eq(null);
    } finally {
      wrapper.unmount();
    }
  });

  it('detaches an in-progress pointer drag and ignores queued observer callbacks after unmount', async () => {
    const queued: Array<() => void> = [];
    const frames: Array<(timestamp: number) => void> = [];
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) {
        queued.push(callback);
      }
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal('requestAnimationFrame', (callback: (timestamp: number) => void) => {
      frames.push(callback); return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const wrapper = mount(HomeColumns, {...globalConfig, attachTo: document.body});
    const handle = wrapper.get<HTMLElement>('[role="separator"]').element;
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = () => true;
    handle.releasePointerCapture = vi.fn();
    const container = wrapper.element as HTMLElement;
    container.getBoundingClientRect = () => ({left: 0, width: 1000}) as DOMRect;
    const pointer = (type: string, x: number) => Object.assign(new Event(type, {bubbles: true}), {pointerId: 1, clientX: x, clientY: 50});
    handle.dispatchEvent(pointer('pointerdown', 500));
    expect(document.activeElement === handle).is.true;
    handle.dispatchEvent(pointer('pointermove', 500));
    expect(container.style.getPropertyValue('--wrybit-player-home-board-share')).eq('50fr');
    wrapper.unmount();
    handle.dispatchEvent(pointer('pointermove', 700));
    handle.dispatchEvent(pointer('pointerup', 700));
    queued.forEach((callback) => callback());
    frames.forEach((callback) => callback(0));
    expect(container.style.getPropertyValue('--wrybit-player-home-board-share')).eq('50fr');
    expect(localStorage.getItem('wrybit.player-home.board_share')).eq(null);
    expect(handle.classList.contains('resize-handle--active')).is.false;
    expect(document.documentElement.style.getPropertyValue(BOARD_COLUMN_LEFT_VARIABLE)).eq('');
  });
});
