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

  it('shows Management Crisis as a loss of one TR', () => {
    const wrapper = mount(Card, {...globalConfig, props: {card: {name: CardName.MANAGEMENT_CRISIS}}});
    const icons = wrapper.get('.card-content');
    expect(icons.findAll('.card-minus')).to.have.length(1);
    expect(icons.get('.card-res-amount').text()).to.equal('1');
    expect(icons.findAll('.card-tr')).to.have.length(1);
    expect(icons.get('.card-minus').element.compareDocumentPosition(icons.get('.card-tr').element) & Node.DOCUMENT_POSITION_FOLLOWING)
      .to.not.equal(0);
    wrapper.unmount();
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
