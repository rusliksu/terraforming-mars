import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import Card from '@/client/components/card/Card.vue';
import CardCost from '@/client/components/card/CardCost.vue';
import {CardName} from '@/common/cards/CardName';
import {FakeLocalStorage} from '../FakeLocalStorage';

describe('Card', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(Card, {
      ...globalConfig,
      props: {
        card: {name: CardName.ECOLINE},
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows discounted cost as the primary cost', () => {
    const wrapper = shallowMount(Card, {
      ...globalConfig,
      props: {
        card: {
          name: CardName.ACQUIRED_COMPANY,
          calculatedCost: 7,
        },
      },
    });

    const cost = wrapper.getComponent(CardCost);
    expect(cost.props('amount')).to.eq(7);
    expect(cost.props('newCost')).to.eq(10);
  });
});
