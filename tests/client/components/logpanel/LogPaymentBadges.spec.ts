import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import LogPaymentBadges from '@/client/components/logpanel/LogPaymentBadges.vue';

describe('LogPaymentBadges', () => {
  it('renders a badge per spent resource, in payment order', () => {
    const wrapper = mount(LogPaymentBadges, {
      ...globalConfig,
      props: {payment: {megacredits: 7, steel: 1, titanium: 0}},
    });

    const badges = wrapper.findAll('.action-log-payment');
    expect(badges).has.length(2);
    expect(badges[0].find('.action-log-effect-amount').text()).eq('−7');
    expect(badges[0].find('.resource_icon').classes()).contains('resource_icon--megacredits');
    expect(badges[0].attributes('aria-label')).eq('Paid 7 megacredits');
    expect(badges[1].find('.resource_icon').classes()).contains('resource_icon--steel');
  });

  it('renders energy alone when a colony trade paid with it', () => {
    const wrapper = mount(LogPaymentBadges, {
      ...globalConfig,
      props: {payment: {megacredits: 0, steel: 0, titanium: 0, energy: 3}},
    });

    const badges = wrapper.findAll('.action-log-payment');
    expect(badges).has.length(1);
    expect(badges[0].find('.resource_icon').classes()).contains('resource_icon--energy');
    expect(badges[0].find('.action-log-effect-amount').text()).eq('−3');
  });

  it('renders nothing without a payment, or when every amount is zero', () => {
    const withoutPayment = mount(LogPaymentBadges, {...globalConfig, props: {}});
    expect(withoutPayment.findAll('.action-log-payment')).has.length(0);

    const zeroes = mount(LogPaymentBadges, {
      ...globalConfig,
      props: {payment: {megacredits: 0, steel: 0, titanium: 0}},
    });
    expect(zeroes.findAll('.action-log-payment')).has.length(0);
  });
});
