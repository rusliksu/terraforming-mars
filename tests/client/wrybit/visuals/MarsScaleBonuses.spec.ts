import {mount} from '@vue/test-utils';
import {nextTick} from 'vue';
import {expect} from 'chai';
import MarsScaleBonuses from '@/client/wrybit/visuals/board/MarsScaleBonuses.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit bonus size during board resizing', () => {
  it('updates the counter scale on viewport resize and releases its listener on unmount', async () => {
    const board = document.createElement('div');
    board.className = 'board-cont';
    document.body.appendChild(board);
    let width = 670;
    let measurements = 0;
    Object.defineProperty(board, 'offsetWidth', {value: 670});
    board.getBoundingClientRect = () => {
      measurements++;
      return new DOMRect(0, 0, width, 640);
    };
    const wrapper = mount(MarsScaleBonuses, {...globalConfig, props: {pins: []}, attachTo: board});
    try {
      width = 335;
      window.dispatchEvent(new Event('resize'));
      await nextTick();
      expect(wrapper.get('.mars-scale-bonuses').attributes('style')).contains('--wrybit-mars-chip-scale: 2');
      wrapper.unmount();
      const afterUnmount = measurements;
      window.dispatchEvent(new Event('resize'));
      expect(measurements).eq(afterUnmount);
    } finally {
      if (wrapper.exists()) {
        wrapper.unmount();
      }
      board.remove();
    }
  });
});
