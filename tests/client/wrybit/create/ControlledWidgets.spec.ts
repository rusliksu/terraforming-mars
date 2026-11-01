import {mount} from '@vue/test-utils';
import {defineComponent, reactive, shallowRef} from 'vue';
import {expect} from 'chai';
import NumberStepper from '@/client/wrybit/create/NumberStepper.vue';
import SwitchInput from '@/client/wrybit/create/SwitchInput.vue';
import CollapsibleSection from '@/client/wrybit/create/CollapsibleSection.vue';
import {ControlledCreateFields, ScalarCreateField, useCreateFields} from '@/client/wrybit/create/controlledFields';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {CreateGameModel} from '@/client/components/create/CreateGameModel';
import {Expansion} from '@/common/cards/GameModule';
import {globalConfig} from '@tests/client/components/getLocalVue';

function controller(count: number): ControlledCreateFields {
  const model = reactive({...defaultCreateGameModel(), playersCount: count});
  return {model,
    setField<K extends ScalarCreateField>(key: K, value: CreateGameModel[K]) {
      (model as unknown as Record<string, unknown>)[key as string] = value;
    },
    setExpansion(key: Expansion, enabled: boolean) {
      model.expansions[key] = enabled;
    },
  };
}

describe('source creation widgets with our controlled settings', () => {
  it('edits the latest owner and retains values while the source section closes and reopens', async () => {
    const first = controller(2);
    const second = controller(4);
    const Root = defineComponent({components: {NumberStepper, SwitchInput, CollapsibleSection}, setup() {
      const owner = shallowRef(first);
      return {owner, ...useCreateFields(() => owner.value)};
    }, template: '<CollapsibleSection title="Settings" storageKey="controlled-widget-proof" :defaultOpen="true"><NumberStepper v-model="field(\'playersCount\').value" :min="1" :max="6"/><SwitchInput v-model="expansion(\'rebalanced\').value" ariaLabel="Rebalanced"/></CollapsibleSection>'});
    const wrapper = mount(Root, globalConfig);
    try {
      await wrapper.get('button[aria-label="+"]').trigger('click');
      expect(first.model.playersCount).eq(3);
      wrapper.vm.owner = second;
      await wrapper.vm.$nextTick();
      expect(wrapper.get('.create-game-stepper-value').text()).eq('4');
      await wrapper.get('button[aria-label="+"]').trigger('click');
      await wrapper.get('input[type=checkbox]').setValue(true);
      expect(second.model.playersCount).eq(5);
      expect(second.model.expansions.rebalanced).is.true;
      expect(first.model.playersCount).eq(3);
      const input = wrapper.get('input').element;
      await wrapper.get('.create-game-collapsible-toggle').trigger('click');
      await wrapper.get('.create-game-collapsible-toggle').trigger('click');
      expect(wrapper.get('input').element).eq(input);
      expect(wrapper.get('.create-game-stepper-value').text()).eq('5');
      expect(wrapper.get<HTMLInputElement>('input').element.checked).is.true;
    } finally {
      wrapper.unmount();
      localStorage.removeItem('wrybit-create-game-open-controlled-widget-proof');
    }
  });
});
