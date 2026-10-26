import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import SelectAmount from '@/client/wrybit/inputs/SelectAmount.vue';
import SelectOption from '@/client/wrybit/inputs/SelectOption.vue';
import SelectDelegate from '@/client/wrybit/inputs/SelectDelegate.vue';
import AmountSlider from '@/client/wrybit/inputs/amount/AmountSlider.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {PlayerInputModel} from '@/common/models/PlayerInputModel';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';

describe('source amount, option and delegate views through our controllers', () => {
  it('focuses a pointer-selected slider for keyboard adjustment and releases drag state on unmount', async () => {
    const wrapper = mount(AmountSlider, {...globalConfig, attachTo: document.body, props: {modelValue: 1, min: 0, max: 4}});
    try {
      const slider = wrapper.get('[role=slider]');
      await slider.trigger('pointerdown');
      expect(document.activeElement).eq(slider.element);
      expect(document.body.classList.contains('wrybit-amount-slider-dragging')).is.true;
      await slider.trigger('keydown', {key: 'ArrowRight'});
      expect(wrapper.emitted('update:modelValue')?.at(-1)).deep.eq([2]);
    } finally {
      wrapper.unmount();
    }
    expect(document.body.classList.contains('wrybit-amount-slider-dragging')).is.false;
  });
  it('retains native defaults and drafts across views, then sends the exact ordered aggregate', async () => {
    const views: InputPresentationRegistry = {amount: markRaw(SelectAmount), option: markRaw(SelectOption), delegate: markRaw(SelectDelegate)};
    const registry = shallowRef<InputPresentationRegistry | undefined>(views);
    const playerinput: PlayerInputModel = {type: 'and', title: 'Choose', buttonLabel: 'Submit', options: [
      {type: 'amount', title: 'Insulation', buttonLabel: 'Decrease', min: 0, max: 5, maxByDefault: false},
      {type: 'delegate', title: 'Choose delegate', buttonLabel: 'Confirm', players: ['NEUTRAL']},
      {type: 'option', title: 'Proceed', buttonLabel: 'Confirm'},
    ]};
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {props: {playerView: fakePlayerViewModel(), playerinput, onsave: save, showsave: true},
      global: {...globalConfig.global, components: {PlayerInputFactory}, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    try {
      await flushPromises();
      const slider = wrapper.get('[role=slider]');
      expect(slider.attributes('aria-valuenow')).eq('0');
      await slider.trigger('keydown', {key: 'ArrowRight'});
      await slider.trigger('keydown', {key: 'ArrowRight'});
      await wrapper.get('input[value=NEUTRAL]').setValue(true);
      registry.value = undefined;
      await wrapper.vm.$nextTick();
      expect(wrapper.get<HTMLInputElement>('input[type=number]').element.value).eq('2');
      expect(wrapper.get<HTMLInputElement>('input[value=NEUTRAL]').element.checked).is.true;
      registry.value = views;
      await wrapper.vm.$nextTick();
      expect(wrapper.get('[role=slider]').attributes('aria-valuenow')).eq('2');
      expect(save.mock.calls).has.length(0);
      expect(wrapper.vm.saveData()).eq('saved');
      expect(save.mock.calls).deep.eq([[{type: 'and', responses: [
        {type: 'amount', amount: 2}, {type: 'delegate', player: 'NEUTRAL'}, {type: 'option'},
      ]}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('takes the maximum default and range from our input model', async () => {
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {props: {playerView: fakePlayerViewModel(),
      playerinput: {type: 'amount', title: 'Amount', buttonLabel: 'Save', min: 2, max: 4, maxByDefault: true}, onsave: save, showsave: true},
    global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => ({amount: markRaw(SelectAmount)}))}}});
    try {
      expect(wrapper.get('[role=slider]').attributes('aria-valuenow')).eq('4');
      await wrapper.get('[role=slider]').trigger('keydown', {key: 'ArrowRight'});
      expect(wrapper.get('[role=slider]').attributes('aria-valuenow')).eq('4');
      await wrapper.get('[role=slider]').trigger('keydown', {key: 'ArrowLeft'});
      expect(wrapper.vm.saveData()).eq('saved');
      expect(save.mock.calls).deep.eq([[{type: 'amount', amount: 3}]]);
    } finally {
      wrapper.unmount();
    }
  });
});
