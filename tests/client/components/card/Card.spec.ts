import {mount, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import Card from '@/client/components/card/Card.vue';
import {CardName} from '@/common/cards/CardName';
import {FakeLocalStorage} from '../FakeLocalStorage';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {CardType} from '@/common/cards/CardType';
import {CustomCardModel} from '@/common/models/CardModel';
import {ICardRenderRoot} from '@/common/cards/render/Types';

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

  it('renders a Custom Card Maker card via the customCard wire fallback', () => {
    const customCard: CustomCardModel = {
      type: CardType.AUTOMATED,
      cost: 12,
      tags: [],
      requirements: [],
      metadata: {description: 'Does a custom thing.', renderData: {is: 'root', rows: []} as ICardRenderRoot},
      module: 'customCards',
      compatibility: [],
    };
    const wrapper = mount(Card, {
      ...globalConfig,
      props: {
        card: {name: 'My Custom Card' as CardName, customCard},
      },
    });
    expect(wrapper.exists()).to.be.true;
    expect(wrapper.text()).to.contain('My Custom Card');
  });

  it('throws if a card is neither in the static manifest nor carries customCard fallback data', () => {
    expect(() => mount(Card, {
      ...globalConfig,
      props: {
        card: {name: 'Not A Real Card' as CardName},
      },
    })).to.throw('card not found');
  });
});
