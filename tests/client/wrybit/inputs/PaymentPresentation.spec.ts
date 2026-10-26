import {mount} from '@vue/test-utils';
import {computed, defineComponent, markRaw, shallowRef, PropType} from 'vue';
import {expect} from 'chai';
import PaymentForm from '@/client/components/PaymentForm.vue';
import SourcePaymentForm from '@/client/wrybit/inputs/PaymentForm.vue';
import {newDefaultLedger} from '@/client/components/PaymentLedger';
import {INPUT_PRESENTATIONS, InputPresentationRegistry, PaymentFormBinding} from '@/client/wrybit/inputs/presentation';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('permanent payment controller presentation', () => {
  it('renders the source balance using our energy and Nereid ledger and exact commands', async () => {
    const registry = computed(() => ({paymentForm: markRaw(SourcePaymentForm)}));
    const wrapper = mount(PaymentForm, {...globalConfig, props: {
      cost: 10, order: ['energy', 'nereidMicrobes', 'megacredits'],
      ledger: {...newDefaultLedger(), energy: {available: 3, rate: 1, reserved: true}, nereidMicrobes: {available: 2, rate: 3}, megacredits: {available: 20, rate: 1}},
      showsave: true, buttonLabel: 'Save',
    }, global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: registry}}});
    try {
      await wrapper.get('[data-test=energy] [data-test=target]').trigger('click');
      expect(wrapper.vm.payment.energy).eq(3);
      expect(wrapper.vm.payment.nereidMicrobes).eq(2);
      expect(wrapper.vm.payment.megacredits).eq(1);
      expect(wrapper.get('[data-test=rest-energy]').text()).eq('0');
      expect(wrapper.find('.card-warning').exists()).is.true;
      await wrapper.get('[data-test=nereidMicrobes] .btn-minus').trigger('click');
      expect(wrapper.vm.payment.nereidMicrobes).eq(1);
      expect(wrapper.vm.payment.megacredits).eq(4);
      await wrapper.get('[data-test=save]').trigger('click');
      expect(wrapper.emitted('save')?.[0][0]).deep.eq(wrapper.vm.payment);
    } finally {
      wrapper.unmount();
    }
  });
  it('keeps the draft and controller while replacing its view and delegates commands and validation', async () => {
    const SourceView = markRaw(defineComponent({props: {binding: {type: Object as PropType<PaymentFormBinding>, required: true}}, template: '<section data-source-payment><button data-plus @click="binding.plus(\'heat\')">+</button><button data-save @click="binding.save()">Save</button><span>{{binding.payment.heat}}/{{binding.payment.megacredits}}</span></section>'}));
    const registry = shallowRef<InputPresentationRegistry>();
    const wrapper = mount(PaymentForm, {...globalConfig, props: {
      cost: 10, order: ['heat', 'megacredits'],
      ledger: {...newDefaultLedger(), heat: {available: 4, rate: 1}, megacredits: {available: 20, rate: 1}},
      showsave: true, buttonLabel: 'Save',
    }, global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    try {
      const controller = wrapper.vm.$.uid;
      await wrapper.get('[data-test=heat] .btn-max').trigger('click');
      expect(wrapper.vm.payment.heat).eq(4);
      expect(wrapper.vm.payment.megacredits).eq(6);
      registry.value = {paymentForm: SourceView};
      await wrapper.vm.$nextTick();
      expect(wrapper.get('[data-source-payment]').text()).contains('4/6');
      expect(wrapper.vm.$.uid).eq(controller);
      expect(wrapper.emitted('save')).is.undefined;
      await wrapper.get('[data-plus]').trigger('click');
      expect(wrapper.vm.payment.heat).eq(4);
      wrapper.vm.payment.megacredits = 0;
      await wrapper.get('[data-save]').trigger('click');
      expect(wrapper.vm.warning).eq("Haven't spent enough");
      expect(wrapper.emitted('save')).is.undefined;
      registry.value = undefined;
      await wrapper.vm.$nextTick();
      expect(wrapper.get<HTMLInputElement>('[data-test=heat] input').element.value).eq('4');
      expect(wrapper.get<HTMLInputElement>('[data-test=megacredits] input').element.value).eq('0');
      expect(wrapper.vm.$.uid).eq(controller);
    } finally {
      wrapper.unmount();
    }
  });
});
