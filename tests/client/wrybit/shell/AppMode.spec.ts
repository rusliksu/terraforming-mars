import {shallowMount} from '@vue/test-utils';
import {defineComponent, markRaw, nextTick} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import App from '@/client/components/App.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit App mode', () => {
  let storage: FakeLocalStorage;

  beforeEach(() => {
    storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
    window.history.replaceState({}, '', '/');
  });

  afterEach(async () => {
    await vi.dynamicImportSettled();
    FakeLocalStorage.deregister(storage);
    PreferencesManager.resetForTest();
  });

  it('opts in at the App boundary and returns without discarding the visible form', async () => {
    const Form = defineComponent({
      data: () => ({card: 'fixture-card-a', payment: 7}),
      template: '<div><input data-test="card" v-model="card"><input data-test="payment" v-model="payment" type="number"></div>',
    });
    const Boundary = defineComponent({
      props: {enabled: Boolean, screen: String},
      emits: ['classic', 'active'],
      template: '<section data-test="boundary" :data-enabled="enabled"><button @click="$emit(\'classic\')" data-test="classic">Classic</button><slot /></section>',
    });
    const wrapper = shallowMount(App, {
      global: {...globalConfig.global, stubs: {StartScreen: Form, WrybitBoundary: Boundary}},
    });
    try {
      await nextTick();
      expect(wrapper.find('[data-test="boundary"]').exists()).is.true;
      expect(wrapper.find('[data-test="boundary"]').attributes('data-enabled')).eq('false');
      const cardInput = wrapper.get('[data-test="card"]');
      const paymentInput = wrapper.get('[data-test="payment"]');
      await cardInput.setValue('fixture-card-b');
      await paymentInput.setValue(19);

      PreferencesManager.INSTANCE.set('experimental_layout', true);
      await nextTick();
      expect(wrapper.get('[data-test="boundary"]').attributes('data-enabled')).eq('true');
      expect(wrapper.classes()).not.include('wrybit-ui');
      wrapper.getComponent(Boundary).vm.$emit('active', true);
      await nextTick();
      expect(wrapper.classes()).include('wrybit-ui');
      expect(wrapper.get('[data-test="card"]').element).eq(cardInput.element);
      expect(wrapper.get('[data-test="payment"]').element).eq(paymentInput.element);

      await wrapper.get('[data-test="classic"]').trigger('click');
      expect(PreferencesManager.INSTANCE.values().experimental_layout).is.false;
      expect(wrapper.classes()).not.include('wrybit-ui');
      expect(storage.getItem('experimental_layout')).eq('0');
      expect(wrapper.get<HTMLInputElement>('[data-test="card"]').element.value).eq('fixture-card-b');
      expect(wrapper.get<HTMLInputElement>('[data-test="payment"]').element.value).eq('19');
      expect(wrapper.get('[data-test="card"]').element).eq(cardInput.element);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses the supplied catalogue only after opt in and shell readiness, then returns to classic', async () => {
    window.history.replaceState({}, '', '/cards');
    const Classic = defineComponent({template: '<div data-test="classic-catalog"/>'});
    const Wrybit = markRaw(defineComponent({template: '<div data-test="wrybit-catalog"/>'}));
    const Boundary = defineComponent({props: ['enabled', 'screen'], emits: ['classic', 'active', 'views'], template: '<div/>'});
    const wrapper = shallowMount(App, {global: {...globalConfig.global, stubs: {
      CardList: Classic, WrybitBoundary: Boundary,
    }}});
    try {
      await nextTick();
      expect(wrapper.find('[data-test="classic-catalog"]').exists()).is.true;
      wrapper.getComponent(Boundary).vm.$emit('views', {cards: Wrybit});
      await nextTick();
      expect(wrapper.findComponent(Wrybit).exists()).is.false;
      PreferencesManager.INSTANCE.set('experimental_layout', true);
      await nextTick();
      expect(wrapper.find('[data-test="classic-catalog"]').exists()).is.true;
      wrapper.getComponent(Boundary).vm.$emit('active', true);
      await nextTick();
      expect(wrapper.findComponent(Wrybit).exists()).is.true;
      expect(wrapper.find('[data-test="classic-catalog"]').exists()).is.false;
      wrapper.getComponent(Boundary).vm.$emit('classic');
      await nextTick();
      expect(wrapper.find('[data-test="classic-catalog"]').exists()).is.true;
      expect(wrapper.findComponent(Wrybit).exists()).is.false;
      expect(PreferencesManager.INSTANCE.values().experimental_layout).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
