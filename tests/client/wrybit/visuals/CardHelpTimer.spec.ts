import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import CardHelp from '@/client/wrybit/visuals/card/CardHelp.vue';
import PlayerTimer from '@/client/wrybit/visuals/overview/PlayerTimer.vue';
import {CardName} from '@/common/cards/CardName';
import {fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit card help and player timer', () => {
  it('opens our help text in the isolated source popup and closes it with Escape', async () => {
    const wrapper = mount(CardHelp, {...globalConfig, props: {name: CardName.AIR_RAID, hovering: true}});
    try {
      await wrapper.get('.card-help-icon').trigger('click');
      const popup = document.querySelector('.wrybit-ui.wrybit-overlay-root [role="dialog"]');
      expect(popup?.textContent).contains('Air Raid requires removing 1 floater');
      window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      await wrapper.vm.$nextTick();
      expect(document.querySelector('.wrybit-overlay-root .popup-outer')).eq(null);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps recorded clocks still, follows snapshots and clears the live ticker', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const timer = fakePublicPlayerModel({timer: {sumElapsed: 10_000, startedAt: 995_000, running: true}}).timer;
    const wrapper = mount(PlayerTimer, {...globalConfig, props: {timer, live: false}});
    try {
      expect(wrapper.text()).eq('00:10');
      expect(vi.getTimerCount()).eq(0);
      await vi.advanceTimersByTimeAsync(5000);
      expect(wrapper.text()).eq('00:10');
      await wrapper.setProps({timer: {...timer, sumElapsed: 20_000}});
      expect(wrapper.text()).eq('00:20');
      await wrapper.setProps({timer, live: true});
      expect(wrapper.text()).eq('00:20');
      await vi.advanceTimersByTimeAsync(1000);
      expect(wrapper.text()).eq('00:21');
      await wrapper.setProps({live: false});
      expect(wrapper.text()).eq('00:10');
      expect(vi.getTimerCount()).eq(0);
      await wrapper.setProps({live: true});
      wrapper.unmount();
      expect(vi.getTimerCount()).eq(0);
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });
});
