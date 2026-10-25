import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import SelectResource from '@/client/wrybit/inputs/SelectResource.vue';
import SelectResources from '@/client/wrybit/inputs/SelectResources.vue';
import SelectProductionToLose from '@/client/wrybit/inputs/SelectProductionToLose.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {PlayerInputModel} from '@/common/models/PlayerInputModel';
import {Units} from '@/common/Units';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';

function mountInput(playerinput: PlayerInputModel) {
  const registry = shallowRef<InputPresentationRegistry | undefined>({resource: markRaw(SelectResource), resources: markRaw(SelectResources),
    productionToLose: markRaw(SelectProductionToLose)});
  const save = vi.fn();
  const wrapper = mount(PlayerInputFactory, {props: {playerView: fakePlayerViewModel(), playerinput, onsave: save, showsave: true},
    global: {...globalConfig.global, components: {PlayerInputFactory}, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
  return {wrapper, save, registry};
}

describe('source resource views through our controllers', () => {
  it('requires an offered resource and keeps the native allocation cap and exact response across views', async () => {
    const {wrapper, save, registry} = mountInput({type: 'and', title: 'Resources', buttonLabel: 'Save', options: [
      {type: 'resource', title: 'Choose resource', buttonLabel: 'Save', include: ['steel', 'titanium']},
      {type: 'resources', title: 'Gain two', buttonLabel: 'Save', count: 2},
    ]});
    try {
      await flushPromises();
      expect(wrapper.vm.canSave()).is.false;
      await wrapper.get('input[value=titanium]').setValue(true);
      await wrapper.get('[data-test=heat] .btn-plus').trigger('click');
      await wrapper.get('[data-test=heat] .btn-plus').trigger('click');
      await wrapper.get('[data-test=steel] .btn-plus').trigger('click');
      expect(wrapper.get<HTMLInputElement>('[data-test=heat] input').element.value).eq('2');
      expect(wrapper.get<HTMLInputElement>('[data-test=steel] input').element.value).eq('0');
      registry.value = undefined;
      await wrapper.vm.$nextTick();
      expect(wrapper.get<HTMLInputElement>('input[value=titanium]').element.checked).is.true;
      expect(wrapper.get<HTMLInputElement>('[data-test=heat] input').element.value).eq('2');
      expect(wrapper.vm.saveData()).eq('saved');
      expect(save.mock.calls).deep.eq([[{type: 'and', responses: [
        {type: 'resource', resource: 'titanium'}, {type: 'resources', units: {...Units.EMPTY, heat: 2}},
      ]}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses our offered production, clamps at the native minimum and rejects an incomplete payment', async () => {
    const {wrapper, save} = mountInput({type: 'productionToLose', title: 'Pay production', buttonLabel: 'Pay',
      payProduction: {cost: 2, units: {...Units.EMPTY, megacredits: -4, titanium: 1}}});
    try {
      expect(wrapper.find('[data-unit=plants]').exists()).is.false;
      expect(wrapper.vm.saveData()).eq('invalid');
      expect(save.mock.calls).has.length(0);
      await wrapper.vm.$nextTick();
      expect(wrapper.get('.tm-warning').text()).contains('Pay a total of 2 production units');
      const mc = wrapper.get('[data-unit=megacredits]');
      await mc.findAll('button')[1].trigger('click');
      await mc.findAll('button')[1].trigger('click');
      expect(mc.get<HTMLInputElement>('input').element.value).eq('1');
      await wrapper.get('[data-unit=titanium]').findAll('button')[1].trigger('click');
      expect(wrapper.vm.saveData()).eq('saved');
      expect(save.mock.calls).deep.eq([[{type: 'productionToLose', units: {...Units.EMPTY, megacredits: 1, titanium: 1}}]]);
    } finally {
      wrapper.unmount();
    }
  });
});
