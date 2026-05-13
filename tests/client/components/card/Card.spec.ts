import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import Card from '@/client/components/card/Card.vue';
import {CardName} from '@/common/cards/CardName';
import {FakeLocalStorage} from '../FakeLocalStorage';
import {PreferencesManager} from '@/client/utils/PreferencesManager';

describe('Card', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    PreferencesManager.resetForTest();
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
  });

  afterEach(() => {
    PreferencesManager.resetForTest();
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

  it('dims used action cards instead of showing a player cube in experimental UI', () => {
    PreferencesManager.INSTANCE.set('experimental_ui', true);

    const wrapper = shallowMount(Card, {
      ...globalConfig,
      props: {
        card: {name: CardName.ANTS},
        actionUsed: true,
      },
    });

    expect(wrapper.classes()).to.include('card-unavailable');
    expect(wrapper.find('.board-cube').exists()).to.eq(false);
  });
});
