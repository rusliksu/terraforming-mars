import {mount} from '@vue/test-utils';
import {computed, h, markRaw} from 'vue';
import {expect} from 'chai';
import NativeFilter from '@/client/components/create/ModuleItemFilter.vue';
import SourceFilter from '@/client/wrybit/create/ModuleItemFilter.vue';
import {CREATE_CONTROLS} from '@/client/wrybit/create/presentation';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import SeatIcon from '@/client/wrybit/visuals/common/SeatIcon.vue';
import NumberStepper from '@/client/wrybit/create/NumberStepper.vue';
import SwitchInput from '@/client/wrybit/create/SwitchInput.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('source grouped filter with native selection constraints', () => {
  it('retains replacement hints and rejects unavailable choices in individual and bulk edits', async () => {
    const controls = {cube: markRaw(PlayerCube), seat: markRaw(SeatIcon), stepper: markRaw(NumberStepper),
      toggle: markRaw(SwitchInput), moduleFilter: markRaw(SourceFilter)};
    const wrapper = mount(NativeFilter, {...globalConfig,
      global: {...globalConfig.global, provide: {[CREATE_CONTROLS as symbol]: computed(() => controls)}},
      props: {embedded: true, title: 'Fixture', groups: [{key: 'fixture', label: 'Fixture'}],
        itemsByGroup: {fixture: ['original', 'replacement', 'requires-expansion']},
        selected: [], selectable: ['replacement'], replacements: new Map([['original', 'replacement']])},
      slots: {item: ({itemName}: {itemName: string}) => h('span', itemName)}});
    try {
      const labels = wrapper.findAll('label.form-checkbox');
      expect(labels[0].attributes('title')).eq('Replaced by replacement');
      expect(labels[2].attributes('title')).eq('Enable required expansions to select this card');
      expect(labels[0].get('input').attributes('disabled')).not.eq(undefined);
      expect(labels[2].get('input').attributes('disabled')).not.eq(undefined);
      await labels[1].get('input').setValue(true);
      expect(wrapper.emitted('update:selected')?.at(-1)).deep.eq([['replacement']]);
      await wrapper.setProps({selected: ['replacement']});
      await wrapper.findAll('a').find((link) => link.text() === 'None*')!.trigger('click');
      expect(wrapper.emitted('update:selected')?.at(-1)).deep.eq([[]]);
      await wrapper.setProps({selected: []});
      await wrapper.findAll('a').find((link) => link.text() === 'All*')!.trigger('click');
      expect(wrapper.emitted('update:selected')?.at(-1)).deep.eq([['replacement']]);
      await wrapper.setProps({selected: ['replacement']});
      await wrapper.findAll('a').find((link) => link.text() === 'Invert*')!.trigger('click');
      expect(wrapper.emitted('update:selected')?.at(-1)).deep.eq([[]]);
    } finally {
      wrapper.unmount();
    }
  });
});
