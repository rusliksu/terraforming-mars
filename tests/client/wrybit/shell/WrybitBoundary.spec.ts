import {flushPromises, mount} from '@vue/test-utils';
import {Component, defineComponent} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import WrybitBoundary from '@/client/wrybit/shell/WrybitBoundary.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

const Shell = defineComponent({
  props: {screen: String},
  emits: ['classic', 'views'],
  mounted() {
    this.$emit('views', {cards: Form});
  },
  template: '<aside data-test="shell"><button @click="$emit(\'classic\')" data-test="classic">Classic</button></aside>',
});
const Form = defineComponent({
  data: () => ({payment: 7}),
  template: '<input type="number" v-model="payment" data-test="payment">',
});

describe('Wrybit boundary', () => {
  it('loads only after opt in and preserves the mounted form when returning', async () => {
    const loadShell = vi.fn(async () => Shell);
    const wrapper = mount(WrybitBoundary, {
      ...globalConfig,
      props: {enabled: false, screen: 'player-home', loadShell},
      slots: {default: Form},
    });
    try {
      await flushPromises();
      expect(loadShell.mock.calls.length).eq(0);
      expect(wrapper.emitted('active')).deep.eq([[false]]);
      expect(wrapper.find('[data-test="shell"]').exists()).is.false;
      const input = wrapper.get<HTMLInputElement>('[data-test="payment"]');
      await input.setValue(19);

      await wrapper.setProps({enabled: true});
      await flushPromises();
      expect(loadShell.mock.calls.length).eq(1);
      expect(wrapper.find('[data-test="shell"]').exists()).is.true;
      expect(wrapper.emitted('active')).deep.eq([[false], [true]]);
      expect(wrapper.emitted('views')?.[0]).deep.eq([{cards: Form}]);
      await wrapper.get('[data-test="classic"]').trigger('click');
      expect(wrapper.emitted('classic')).deep.eq([[]]);
      await wrapper.setProps({enabled: false});
      expect(wrapper.find('[data-test="shell"]').exists()).is.false;
      expect(wrapper.emitted('active')).deep.eq([[false], [true], [false]]);
      expect(wrapper.get<HTMLInputElement>('[data-test="payment"]').element).eq(input.element);
      expect(input.element.value).eq('19');

      await wrapper.setProps({enabled: true});
      await flushPromises();
      expect(loadShell.mock.calls.length).eq(1);
      expect(input.element.value).eq('19');
    } finally {
      wrapper.unmount();
    }
  });

  it('returns to classic when the bundle fails and keeps the form usable', async () => {
    const loadShell = async () => {
      throw new Error('unavailable fixture bundle');
    };
    const wrapper = mount(WrybitBoundary, {
      ...globalConfig,
      props: {enabled: true, screen: 'player-home', loadShell},
      slots: {default: Form},
    });
    try {
      await flushPromises();
      expect(wrapper.emitted('classic')).deep.eq([[]]);
      expect(wrapper.get('[role="alert"]').text()).eq('Wrybit could not be loaded. The classic interface is available.');
      const input = wrapper.get<HTMLInputElement>('[data-test="payment"]');
      await input.setValue(19);
      expect(input.element.value).eq('19');
      expect(wrapper.find('[data-test="shell"]').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });

  it('does not mount a late bundle after the mode has been disabled', async () => {
    let finish: (component: Component) => void = () => {};
    const loadShell = vi.fn(() => new Promise<Component>((resolve) => {
      finish = resolve;
    }));
    const wrapper = mount(WrybitBoundary, {
      ...globalConfig,
      props: {enabled: true, screen: 'player-home', loadShell},
      slots: {default: Form},
    });
    try {
      const input = wrapper.get('[data-test="payment"]');
      await wrapper.setProps({enabled: false});
      finish(Shell);
      await flushPromises();
      expect(wrapper.find('[data-test="shell"]').exists()).is.false;
      expect(wrapper.get('[data-test="payment"]').element).eq(input.element);
      expect(wrapper.emitted('active')).deep.eq([[false]]);
      expect(loadShell.mock.calls.length).eq(1);
    } finally {
      wrapper.unmount();
    }
  });
});
