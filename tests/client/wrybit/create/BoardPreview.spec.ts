import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import CreateGameBoardPreview from '@/client/wrybit/create/CreateGameBoardPreview.vue';
import ScaledBoard from '@/client/wrybit/visuals/board/ScaledBoard.vue';
import type {CreationBoardPreview} from '@/client/wrybit/create/presentation';
import {BoardName} from '@/common/boards/BoardName';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('source creation board preview presentation', () => {
  it('uses supplied custom geometry and distinguishes a random example without choosing a board', async () => {
    const redraw = vi.fn();
    const binding: CreationBoardPreview = {data: {boardName: BoardName.CUSTOM, spaces: [], customBoardRows: 7, randomExample: false},
      loading: false, showBoardName: true, canRedraw: false, redraw};
    const wrapper = mount(CreateGameBoardPreview, {...globalConfig, props: {binding, boardColorClass: () => 'own-board-color'}});
    try {
      expect(wrapper.getComponent(ScaledBoard).props('customBoardRows')).eq(7);
      expect(wrapper.find('button').exists()).is.false;
      expect(wrapper.text()).not.contains('random board will be drawn');
      await wrapper.setProps({binding: {...binding, data: {...binding.data!, randomExample: true}, canRedraw: true, loading: true}});
      expect(wrapper.text()).contains('A random board will be drawn when creating the game.');
      expect(wrapper.find('.create-game-board-preview--loading').exists()).is.true;
      await wrapper.get('button').trigger('click');
      expect(redraw.mock.calls).has.length(1);
      expect(binding.data?.boardName).eq(BoardName.CUSTOM);
      await wrapper.setProps({binding: {...binding, data: undefined, error: 'Offline'}});
      expect(wrapper.findComponent(ScaledBoard).exists()).is.false;
      expect(wrapper.text()).contains('Offline');
    } finally {
      wrapper.unmount();
    }
  });
});
