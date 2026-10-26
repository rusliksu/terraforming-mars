import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import NativeFactory from '@/client/components/PlayerInputFactory.vue';
import NativeAmount from '@/client/components/SelectAmount.vue';
import SourceAmount from '@/client/wrybit/inputs/SelectAmount.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {CardName} from '@/common/cards/CardName';
import {Resource} from '@/common/Resource';
import {SelectAmountModel} from '@/common/models/PlayerInputModel';

describe('source amount converter on native display metadata', () => {
  it('shows the native preview, retains the native minimum default and sends the native selected amount across layouts', async () => {
    const input: SelectAmountModel = {type: 'amount', title: 'Select amount of heat production to decrease', buttonLabel: 'Decrease',
      min: 1, max: 4, maxByDefault: false, preview: {sourceCard: CardName.INSULATION,
        from: {kind: 'production', resource: Resource.HEAT, perStep: 1, before: 4},
        to: {kind: 'production', resource: Resource.MEGACREDITS, perStep: 1, before: 0}}};
    const views = {amount: markRaw(SourceAmount)};
    const registry = shallowRef<InputPresentationRegistry | undefined>(views);
    const save = vi.fn();
    const wrapper = mount(NativeFactory, {attachTo: document.body,
      props: {playerView: fakePlayerViewModel(), playerinput: input, onsave: save, showsave: true, showtitle: true},
      global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    try {
      expect(wrapper.find('.amount-converter').exists()).is.true;
      expect(wrapper.get('.amount-side__after--loss').text()).eq('+3');
      const uid = wrapper.getComponent(NativeAmount).vm.$.uid;
      await wrapper.get('[role=slider]').trigger('keydown', {key: 'ArrowRight'});
      expect(wrapper.get('.amount-side__after--loss').text()).eq('+2');
      expect(wrapper.get('.amount-side__after--gain').text()).eq('+2');
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent(NativeAmount).vm.$.uid).eq(uid);
      expect(wrapper.get<HTMLInputElement>('input[type=number]').element.value).eq('2');
      registry.value = views;
      await flushPromises();
      await wrapper.get('.amount-select__actions button').trigger('click');
      expect(save.mock.calls).deep.eq([[{type: 'amount', amount: 2}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows a deferred payment price without inventing a remaining stock value', () => {
    const wrapper = mount(NativeFactory, {props: {playerView: fakePlayerViewModel(), onsave: vi.fn(), showsave: true,
      playerinput: {type: 'amount', title: 'Select amount of energy to gain', buttonLabel: 'Gain energy', min: 1, max: 4, maxByDefault: false,
        preview: {sourceCard: CardName.ENERGY_MARKET, from: {kind: 'cost', resource: Resource.MEGACREDITS, perStep: 2},
          to: {kind: 'stock', resource: Resource.ENERGY, perStep: 1, before: 3}}}},
    global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => ({amount: markRaw(SourceAmount)}))}}});
    try {
      expect(wrapper.get('.amount-converter__from .amount-side__label').text()).eq('Costs');
      expect(wrapper.get('.amount-converter__from .amount-side__values').text()).eq('2');
      expect(wrapper.find('.amount-side__after--loss').exists()).is.false;
      expect(wrapper.get('.amount-side__after--gain').text()).eq('4');
    } finally {
      wrapper.unmount();
    }
  });
});
