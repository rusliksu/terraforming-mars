import {flushPromises, mount} from '@vue/test-utils';
import {defineComponent} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import {Payment} from '@/common/inputs/Payment';
import {PlayerInputModel, SelectPaymentModel} from '@/common/models/PlayerInputModel';
import {SaveAttempt, SaveOutcome} from '@/client/wrybit/inputs/saveAttempt';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';

function paymentInput(amount: number): SelectPaymentModel {
  return {type: 'payment', title: 'Pay', buttonLabel: 'Pay', amount, paymentOptions: {}, seeds: 0, auroraiData: 0,
    kuiperAsteroids: 0, spireScience: 0, reserveUnits: undefined, floaters: 0, microbes: 0, graphene: 0};
}

describe('nested input save completion', () => {
  it('collects pending child responses sequentially and sends one complete response with native indices', async () => {
    const confirmations: Array<() => void> = [];
    // Boundary double for confirmation timing; real Factory/and/or/payment wrappers perform collection.
    const PendingPayment = defineComponent({
      props: {cost: {type: Number, required: true}}, emits: ['save', 'change'], template: '<div/>',
      methods: {
        handleSave(_attempt?: SaveAttempt, respond?: (payment: Payment) => void): Promise<SaveOutcome> {
          return new Promise((resolve) => confirmations.push(() => {
            const payment = Payment.of({megacredits: this.cost});
            if (respond !== undefined) {
              respond(payment);
            } else {
              this.$emit('save', payment);
            }
            resolve('saved');
          }));
        },
      },
    });
    const input: PlayerInputModel = {type: 'and', title: 'Combined', buttonLabel: 'Save', options: [paymentInput(5),
      {type: 'or', title: 'Choose', buttonLabel: 'Save', initialIdx: 1, options: [
        {type: 'option', title: 'Skip', buttonLabel: 'Skip'}, paymentInput(7),
      ]},
    ]};
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {global: {...globalConfig.global, components: {PlayerInputFactory}, stubs: {PaymentForm: PendingPayment}},
      props: {playerView: fakePlayerViewModel(), playerinput: input, onsave: save, showsave: true}});
    try {
      await flushPromises();
      const completion = wrapper.vm.saveData();
      expect(save.mock.calls).has.length(0);
      expect(confirmations).has.length(1);
      confirmations[0]();
      await flushPromises();
      expect(save.mock.calls).has.length(0);
      expect(confirmations).has.length(2);
      confirmations[1]();
      await completion;
      expect(save.mock.calls).deep.eq([[{type: 'and', responses: [
        {type: 'payment', payment: Payment.of({megacredits: 5})},
        {type: 'or', index: 1, response: {type: 'payment', payment: Payment.of({megacredits: 7})}},
      ]}]]);
    } finally {
      wrapper.unmount();
    }
  });
});
