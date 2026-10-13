import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import Card from '@/client/wrybit/visuals/card/Card.vue';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {CardModel, CustomCardModel} from '@/common/models/CardModel';
import {ICardRenderRoot} from '@/common/cards/render/Types';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';

describe('Wrybit card with our canonical card data', () => {
  let storage: FakeLocalStorage;
  beforeEach(() => {
    storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
    PreferencesManager.INSTANCE.set('experimental_layout', true);
  });
  afterEach(() => {
    PreferencesManager.resetForTest();
    FakeLocalStorage.deregister(storage);
  });

  it('renders the server cost and copy title without changing the card identity', () => {
    const card: CardModel = {name: CardName.BIRDS, calculatedCost: 7, combinedDisplayName: 'Birds Copy'};
    const wrapper = mount(Card, {...globalConfig, props: {card}});
    try {
      expect(wrapper.get('.card-cost').text()).eq('10');
      expect(wrapper.get('.card-old-cost').text()).eq('7');
      expect(wrapper.get('.card-title .card-title').text()).eq('Birds Copy');
      expect(wrapper.getComponent({name: 'CardTitle'}).props('title')).eq(CardName.BIRDS);
    } finally {
      wrapper.unmount();
    }
  });

  it('renders a custom card through our existing wire fallback', () => {
    const renderData: ICardRenderRoot = {is: 'root', rows: []};
    const customCard: CustomCardModel = {
      type: CardType.AUTOMATED, cost: 12, tags: [], requirements: [],
      metadata: {description: 'Synthetic custom card.', renderData},
      module: 'customCards', compatibility: [],
    };
    const wrapper = mount(Card, {...globalConfig, props: {card: {name: 'Synthetic Custom Card' as CardName, customCard}}});
    try {
      expect(wrapper.get('.card-cost').text()).eq('12');
      expect(wrapper.text()).contains('Synthetic Custom Card');
    } finally {
      wrapper.unmount();
    }
  });

  it('marks a used action with a player cube and retains disabled-card presentation', async () => {
    const wrapper = mount(Card, {...globalConfig, props: {card: {name: CardName.BIRDS}, actionUsed: true, cubeColor: 'blue'}});
    try {
      expect(wrapper.findAll('.card-player-cube .player-cube-face')).has.length(6);
      await wrapper.setProps({card: {name: CardName.BIRDS, isDisabled: true}});
      expect(wrapper.find('.card-player-cube').exists()).is.false;
      expect(wrapper.classes()).contains('card-unavailable');
    } finally {
      wrapper.unmount();
    }
  });
});
