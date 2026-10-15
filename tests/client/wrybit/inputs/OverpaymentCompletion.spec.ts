import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PaymentForm from '@/client/components/PaymentForm.vue';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import SelectAmount from '@/client/components/SelectAmount.vue';
import SourcePayment from '@/client/wrybit/inputs/PaymentForm.vue';
import OverpaymentDialog from '@/client/wrybit/visuals/OverpaymentDialog.vue';
import {newDefaultLedger} from '@/client/components/PaymentLedger';
import {INPUT_PRESENTATIONS} from '@/client/wrybit/inputs/presentation';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {Payment} from '@/common/inputs/Payment';
import {PlayerInputModel} from '@/common/models/PlayerInputModel';

const registry = computed(() => ({paymentForm: markRaw(SourcePayment)}));
function mountPayment() {
  return mount(PaymentForm, {...globalConfig, props: {cost: 5, order: ['titanium', 'megacredits'],
    ledger: {...newDefaultLedger(), titanium: {available: 2, rate: 3}, megacredits: {available: 0, rate: 1}},
    showsave: true, buttonLabel: 'Pay'}, global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: registry}}});
}

describe('canonical payment confirmation through Wrybit', () => {
  let storage: FakeLocalStorage;
  beforeEach(() => {
    storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
    PreferencesManager.INSTANCE.set('show_alerts', true);
  });
  afterEach(() => {
    FakeLocalStorage.deregister(storage);
    PreferencesManager.resetForTest();
  });

  it('waits for real dialog acceptance, ignores duplicate save/accept and sends an independent confirmed payment', async () => {
    const wrapper = mountPayment();
    try {
      await wrapper.get('[data-test=titanium] input').setValue('2');
      const completion = wrapper.vm.handleSave();
      await flushPromises();
      expect(wrapper.emitted('save')).is.undefined;
      expect(wrapper.getComponent(OverpaymentDialog).get('[data-test=excess]').text()).contains('+1');
      expect(await wrapper.vm.handleSave()).eq('cancelled');
      const accept = wrapper.vm.presentationBinding.acceptOverpayment;
      await wrapper.getComponent(OverpaymentDialog).get('[data-test=accept]').trigger('click');
      expect(await completion).eq('saved');
      accept();
      expect(wrapper.emitted('save')).has.length(1);
      await wrapper.get('[data-test=titanium] input').setValue('0');
      expect(wrapper.emitted('save')?.[0][0]).deep.eq(Payment.of({titanium: 2}));
    } finally {
      wrapper.unmount();
    }
  });

  it('cancels a changed draft and an old dialog action cannot accept a newer payment', async () => {
    const wrapper = mountPayment();
    try {
      await wrapper.get('[data-test=titanium] input').setValue('2');
      const first = wrapper.vm.handleSave();
      const oldAccept = wrapper.vm.presentationBinding.acceptOverpayment;
      await wrapper.get('[data-test=titanium] input').setValue('1');
      expect(wrapper.vm.pendingOverpayment, 'editing payment cancels its open confirmation').is.undefined;
      expect(await first).eq('cancelled');
      expect(wrapper.emitted('save')).is.undefined;
      await wrapper.get('[data-test=titanium] input').setValue('2');
      const second = wrapper.vm.handleSave();
      oldAccept();
      expect(wrapper.vm.pendingOverpayment).not.eq(undefined);
      expect(wrapper.emitted('save')).is.undefined;
      wrapper.vm.presentationBinding.dismissOverpayment();
      expect(wrapper.vm.pendingOverpayment, 'dismiss closes the current confirmation').is.undefined;
      expect(await second).eq('cancelled');
      expect(wrapper.vm.warning).eq('Please adjust payment amount');
      expect(wrapper.vm.payment.titanium).eq(2);
    } finally {
      wrapper.unmount();
    }
  });

  it('cancels the whole aggregate when a previously collected sibling changes and recollects fresh values', async () => {
    const input: PlayerInputModel = {type: 'and', title: 'Combined', buttonLabel: 'Save', options: [
      {type: 'amount', title: 'Amount', buttonLabel: 'Save', min: 0, max: 3, maxByDefault: false},
      {type: 'payment', title: 'Pay', buttonLabel: 'Pay', amount: 5, paymentOptions: {titanium: true},
        seeds: 0, auroraiData: 0, kuiperAsteroids: 0, spireScience: 0, reserveUnits: undefined, floaters: 0, microbes: 0, graphene: 0},
    ]};
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {global: {...globalConfig.global, components: {PlayerInputFactory}, provide: {[INPUT_PRESENTATIONS as symbol]: registry}},
      props: {playerView: fakePlayerViewModel({thisPlayer: fakePublicPlayerModel({megacredits: 0, titanium: 2, titaniumValue: 3})}), playerinput: input, onsave: save, showsave: true}});
    try {
      await flushPromises();
      const form = wrapper.getComponent(PaymentForm);
      await form.get('[data-test=titanium] input').setValue('2');
      const first = wrapper.vm.saveData();
      const oldAccept = form.vm.presentationBinding.acceptOverpayment;
      expect(save.mock.calls).has.length(0);
      wrapper.getComponent(SelectAmount).vm.amount = '1';
      expect(await first).eq('cancelled');
      oldAccept();
      expect(save.mock.calls).has.length(0);
      const second = wrapper.vm.saveData();
      form.vm.presentationBinding.acceptOverpayment();
      expect(await second).eq('saved');
      expect(save.mock.calls).deep.eq([[{type: 'and', responses: [
        {type: 'amount', amount: 1}, {type: 'payment', payment: Payment.of({titanium: 2})},
      ]}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('cancels a confirmation when the available resources change', async () => {
    const wrapper = mountPayment();
    try {
      const completion = wrapper.vm.handleSave();
      const accept = wrapper.vm.presentationBinding.acceptOverpayment;
      await wrapper.setProps({ledger: {...newDefaultLedger(), titanium: {available: 1, rate: 3}}});
      expect(await completion).eq('cancelled');
      accept();
      expect(wrapper.emitted('save')).is.undefined;
      expect(wrapper.vm.pendingOverpayment).is.undefined;
    } finally {
      wrapper.unmount();
    }
  });

  it('cancels an unmounted confirmation and ignores its late acceptance', async () => {
    const wrapper = mountPayment();
    const completion = wrapper.vm.handleSave();
    const accept = wrapper.vm.presentationBinding.acceptOverpayment;
    wrapper.unmount();
    expect(await completion).eq('cancelled');
    accept();
    expect(wrapper.emitted('save')).is.undefined;
  });
});
