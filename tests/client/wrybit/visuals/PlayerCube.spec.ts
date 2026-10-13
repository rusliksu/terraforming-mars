import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import {CREDICOR_COLOR} from '@/common/Color';

describe('Wrybit player cube identity', () => {
  it('preserves our reserved artwork instead of replacing it with an unstyled foreign color', () => {
    const wrapper = mount(PlayerCube, {props: {color: CREDICOR_COLOR, view: 'top', size: 22}});
    try {
      expect(wrapper.find('.board-cube--credicor').exists()).is.true;
      expect(wrapper.find('.player-cube-body').exists()).is.false;
      expect(wrapper.get('.player-cube').attributes('aria-hidden')).eq('true');
    } finally {
      wrapper.unmount();
    }
  });
});
