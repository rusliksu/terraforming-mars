import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import PaymentUnit from '@/client/wrybit/visuals/PaymentUnit.vue';
import CanonicalPaymentUnit from '@/client/components/PaymentUnit.vue';
import OverpaymentDialog from '@/client/wrybit/visuals/OverpaymentDialog.vue';
import {Payment} from '@/common/inputs/Payment';
import {newDefaultLedger} from '@/client/components/PaymentLedger';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit payment visual leaves', () => {
  it('uses our resource icons and emits commands without inventing a target or changing payment state', async () => {
    const props = {unit: 'nereidMicrobes' as const, description: 'Nereid microbes', modelValue: 3};
    const native = mount(CanonicalPaymentUnit, {...globalConfig, props});
    const wrapper = mount(PaymentUnit, {...globalConfig, props});
    try {
      expect(native.get('.payments_type_icon').classes()).include('resource_icon--microbes');
      expect(wrapper.get('.payments_type_icon').classes()).include('resource_icon--microbes');
      expect(wrapper.find('[data-test="target"]').exists()).is.false;
      await wrapper.setProps({target: 7, minusDisabled: true, plusDisabled: true});
      const buttons = wrapper.findAll<HTMLButtonElement>('button');
      expect(buttons[0].element.disabled).is.true;
      expect(buttons[1].element.disabled).is.true;
      await wrapper.get('[data-test="target"]').trigger('click');
      expect(wrapper.emitted('max')).deep.eq([[]]);
      expect(wrapper.get<HTMLInputElement>('input').element.value).eq('3');
      await wrapper.get('input').setValue('4');
      expect(wrapper.emitted('update:modelValue')).deep.eq([['4']]);
      await wrapper.setProps({targetReached: true});
      expect(wrapper.find('[data-test="target"]').exists()).is.false;
      expect(wrapper.get('[data-test="target-reached"]').text()).contains('Max');
      expect(wrapper.emitted('max')).has.length(1);
    } finally {
      wrapper.unmount();
      native.unmount();
    }
  });

  it('renders our supplied rates, resource names and excess without validating, saving or mutating the payment', async () => {
    const payment = Object.freeze(Payment.of({nereidMicrobes: 3}));
    const ledger = {...newDefaultLedger(), nereidMicrobes: {available: 3, rate: 4}};
    const before = JSON.stringify({payment, ledger});
    const wrapper = mount(OverpaymentDialog, {...globalConfig, props: {
      cost: 10, payment, ledger, order: ['nereidMicrobes'], itemName: 'Our custom project', reason: 'Our payment explanation',
    }});
    try {
      expect(wrapper.get('[data-test="excess"]').text()).eq('+2');
      expect(wrapper.get('[data-test="item"]').text()).eq('Our custom project');
      expect(wrapper.get('[data-test="reason"]').text()).eq('Our payment explanation');
      expect(wrapper.get('[data-test="segment-nereidMicrobes"]').get('i').classes()).include('resource_icon--microbes');
      expect(wrapper.get('.overpayment-dialog__legend-calc').text()).eq('3 × 4');
      expect(wrapper.get('.overpayment-dialog__legend-value').text()).eq('= 12');
      expect(wrapper.emitted('accept')).eq(undefined);
      await wrapper.get('[data-test="accept"]').trigger('click');
      expect(wrapper.emitted('accept')).deep.eq([[]]);
      await wrapper.get('[data-test="dismiss"]').trigger('click');
      expect(wrapper.emitted('dismiss')).deep.eq([[]]);
      await wrapper.setProps({cost: 11});
      expect(wrapper.get('[data-test="excess"]').text()).eq('+1');
      expect(JSON.stringify({payment, ledger})).eq(before);
    } finally {
      wrapper.unmount();
    }
  });
});
