import {mount} from '@vue/test-utils';
import {defineComponent, nextTick, provide, ref} from 'vue';
import {expect} from 'chai';
import InputPortal from '@/client/wrybit/shell/InputPortal.vue';
import InputHost from '@/client/wrybit/shell/InputHost.vue';
import {createInputHosts, INPUT_HOSTS} from '@/client/wrybit/shell/inputHosts';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Persistent input portal', () => {
  it('moves one live form between different views and a hidden gap without resetting it', async () => {
    let mounts = 0;
    let saves = 0;
    const Form = defineComponent({
      data: () => ({card: 'selected-card', payment: 19}),
      mounted: () => {mounts++;},
      methods: {save: () => {saves++;}},
      template: '<div><input data-test="card" v-model="card"><input data-test="payment" type="number" v-model="payment"><button @click="save">Save</button></div>',
    });
    const Classic = defineComponent({components: {InputHost}, template: '<section data-view="classic"><InputHost /></section>'});
    const Wrybit = defineComponent({components: {InputHost}, template: '<article data-view="wrybit"><header>Other layout</header><InputHost /></article>'});
    const hosts = createInputHosts();
    const Root = defineComponent({
      components: {Classic, Wrybit, Form, InputPortal},
      setup() {
        provide(INPUT_HOSTS, hosts);
        return {hosts, screen: ref('classic')};
      },
      template: '<Classic v-if="screen === \'classic\'" /><Wrybit v-else-if="screen === \'wrybit\'" /><InputPortal :target="hosts.target.value"><Form /></InputPortal>',
    });
    const wrapper = mount(Root, {...globalConfig, attachTo: document.body});
    try {
      await nextTick();
      const classic = document.querySelector('[data-view="classic"]');
      const input = classic?.querySelector<HTMLInputElement>('[data-test="payment"]');
      expect(input).not.eq(undefined);
      const original = document.querySelector('[data-test="payment"]');
      await wrapper.get('[data-test="payment"]').setValue(23);
      wrapper.vm.screen = 'gap';
      await nextTick();
      expect(document.querySelector('[data-input-fallback]')?.hasAttribute('hidden')).is.true;
      expect(mounts).eq(1);
      wrapper.vm.screen = 'wrybit';
      await nextTick();
      const moved = document.querySelector<HTMLInputElement>('[data-view="wrybit"] [data-test="payment"]');
      expect(moved).eq(original);
      expect(moved?.value).eq('23');
      expect(mounts).eq(1);
      expect(saves).eq(0);

      const current = hosts.target.value;
      hosts.unregister(document.createElement('div'));
      expect(hosts.target.value).eq(current);
      wrapper.vm.screen = 'classic';
      await nextTick();
      expect(document.querySelector('[data-view="classic"] [data-test="payment"]')).eq(original);
      expect(saves).eq(0);
    } finally {
      wrapper.unmount();
      wrapper.element.remove();
    }
  });
});
