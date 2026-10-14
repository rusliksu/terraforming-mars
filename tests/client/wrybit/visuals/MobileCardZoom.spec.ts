import {flushPromises, mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import MobileCardZoom from '@/client/wrybit/visuals/mobile/MobileCardZoom.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit card carousel ownership', () => {
  it('does not complete a close or continue opening animations after unmount', async () => {
    vi.useFakeTimers();
    const originalAnimate = HTMLElement.prototype.animate;
    const animations: Array<{finish: () => void; cancel: ReturnType<typeof vi.fn>}> = [];
    HTMLElement.prototype.animate = (() => {
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const cancel = vi.fn(() => finish());
      animations.push({finish, cancel});
      return {finished, cancel} as unknown as Animation;
    });
    const wrapper = mount(MobileCardZoom, {...globalConfig, props: {count: 2, index: 0},
      slots: {slide: '<div class="card-container">Card</div>'}});
    try {
      await wrapper.get('.mb-card-zoom-close').trigger('click');
      wrapper.unmount();
      animations.forEach((animation) => animation.finish());
      await vi.runAllTimersAsync();
      await flushPromises();
      expect(wrapper.emitted('close')).eq(undefined);
      expect(animations.every((animation) => animation.cancel.mock.calls.length > 0)).is.true;
      expect(vi.getTimerCount()).eq(0);
    } finally {
      wrapper.unmount();
      HTMLElement.prototype.animate = originalAnimate;
      vi.useRealTimers();
    }
  });
});
