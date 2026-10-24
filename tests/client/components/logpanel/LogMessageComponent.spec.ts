import {mount, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import {fakeViewModel} from '../testHelpers';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {CardName} from '@/common/cards/CardName';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {Resource} from '@/common/Resource';
import {CardResource} from '@/common/CardResource';

describe('LogMessageComponent', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(LogMessageComponent, {
      ...globalConfig,
      props: {
        message: new LogMessage(LogMessageType.DEFAULT, 'Test message', []),
        viewModel: fakeViewModel(),
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders CARD type as a single card span', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, '${0}', [
      {type: LogMessageDataType.CARD, value: CardName.ANTS},
    ]);
    const wrapper = shallowMount(LogMessageComponent, {
      ...globalConfig,
      props: {
        message,
        viewModel: fakeViewModel(),
      },
    });

    const cardContainer = wrapper.find('.log-card').element.parentElement!;
    expect(cardContainer.innerHTML).to.equal(
      '<span class="log-card background-color-active">Ants</span>',
    );
  });

  it('marks canceled log messages', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, 'Test message', []);
    message.canceled = true;
    const wrapper = shallowMount(LogMessageComponent, {
      ...globalConfig,
      props: {
        message,
        viewModel: fakeViewModel(),
      },
    });

    expect(wrapper.find('li').classes()).contains('log-message--canceled');
  });

  it('shows what a played card cost', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, '${0} played ${1}', [
      {type: LogMessageDataType.PLAYER, value: 'blue'},
      {type: LogMessageDataType.CARD, value: CardName.ANTS},
    ]);
    message.payment = {megacredits: 7, steel: 1, titanium: 0};
    const wrapper = mount(LogMessageComponent, {
      ...globalConfig,
      props: {
        message,
        viewModel: fakeViewModel(),
      },
    });

    const badges = wrapper.findAll('.action-log-payment');
    expect(badges).has.length(2);
    expect(badges[0].text()).contains('7');
    expect(badges[0].find('.resource_icon').classes()).contains('resource_icon--megacredits');
    expect(badges[1].find('.resource_icon').classes()).contains('resource_icon--steel');
  });

  it('shows energy paid by a colony trade', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, '${0} used ${1} action', [
      {type: LogMessageDataType.PLAYER, value: 'blue'},
      {type: LogMessageDataType.CARD, value: CardName.ANTS},
    ]);
    message.payment = {megacredits: 0, steel: 0, titanium: 0, energy: 3};
    const wrapper = mount(LogMessageComponent, {
      ...globalConfig,
      props: {
        message,
        viewModel: fakeViewModel(),
      },
    });

    const badges = wrapper.findAll('.action-log-payment');
    expect(badges).has.length(1);
    expect(badges[0].find('.resource_icon').classes()).contains('resource_icon--energy');
  });

  it('shows no cost when the message has no payment', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, 'A plain message', []);
    const wrapper = mount(LogMessageComponent, {
      ...globalConfig,
      props: {
        message,
        viewModel: fakeViewModel(),
      },
    });

    expect(wrapper.findAll('.action-log-payment')).has.length(0);
  });
  it('marks irreversible undo messages', () => {
    const message = new LogMessage(LogMessageType.IRREVERSIBLE_UNDO, 'Test message', []);
    const wrapper = shallowMount(LogMessageComponent, {
      ...globalConfig,
      props: {
        message,
        viewModel: fakeViewModel(),
      },
    });

    expect(wrapper.find('li').classes()).contains('log-message--irreversible-undo');
  });

  it('marks bot takeover log messages', () => {
    const message = new LogMessage(LogMessageType.BOT_TAKEOVER, 'A player left the game; a bot is now playing', []);
    const wrapper = shallowMount(LogMessageComponent, {
      ...globalConfig,
      props: {message, viewModel: fakeViewModel()},
    });

    expect(wrapper.find('li').classes()).contains('log-message--bot-takeover');
  });

  it('renders CARDS type as multiple card spans with locale-correct separator in English', () => {
    const message = new LogMessage(
      LogMessageType.DEFAULT,
      '${0}',
      [{type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.BIRDS, CardName.CELESTIC]}]);

    const wrapper = shallowMount(LogMessageComponent, {
      ...globalConfig,
      props: {message, viewModel: fakeViewModel()},
    });

    const cardsContainer = wrapper.find('.log-card').element.parentElement!;
    expect(cardsContainer.innerHTML).to.equal(
      '<span class="log-card background-color-automated">Algae</span>' +
      ', ' +
      '<span class="log-card background-color-active">Birds</span>' +
      ', and ' +
      '<span class="log-card background-color-corporation">Celestic</span>',
    );
  });

  it('renders CARDS type as multiple card spans', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, '${0}', [
      {type: LogMessageDataType.CARDS, value: [CardName.ANTS, CardName.ECOLINE, CardName.BIRDS]},
    ]);
    const wrapper = shallowMount(LogMessageComponent, {
      ...globalConfig,
      props: {
        message,
        viewModel: fakeViewModel(),
      },
    });

    const cardsContainer = wrapper.find('.log-card').element.parentElement!;
    expect(cardsContainer.innerHTML).to.equal(
      '<span class="log-card background-color-active">Ants</span>' +
      ', ' +
      '<span class="log-card background-color-corporation">Ecoline</span>' +
      ', and ' +
      '<span class="log-card background-color-active">Birds</span>',
    );
  });

  it('renders CARDS with locale-correct separator for French (fr)', () => {
    PreferencesManager.INSTANCE.set('lang', 'fr');
    try {
      const message = new LogMessage(
        LogMessageType.DEFAULT,
        '${0}',
        [{type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.BIRDS, CardName.CELESTIC]}]);
      const wrapper = shallowMount(LogMessageComponent, {
        ...globalConfig,
        props: {message, viewModel: fakeViewModel()},
      });
      // French conjunction list format: "A, B et C" (no Oxford comma)
      const cardsContainer = wrapper.find('.log-card').element.parentElement!;
      expect(cardsContainer.innerHTML).to.equal(
        '<span class="log-card background-color-automated">Algae</span>' +
        ', ' +
        '<span class="log-card background-color-active">Birds</span>' +
        ' et ' +
      '<span class="log-card background-color-corporation">Celestic</span>',
      );
    } finally {
      PreferencesManager.resetForTest();
    }
  });

  it('renders CARDS with locale-correct separator for Japanese (jp)', () => {
    PreferencesManager.INSTANCE.set('lang', 'jp');
    try {
      const message = new LogMessage(
        LogMessageType.DEFAULT,
        '${0}',
        [{type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.BIRDS, CardName.CELESTIC]}]);
      const wrapper = shallowMount(LogMessageComponent, {
        ...globalConfig,
        props: {message, viewModel: fakeViewModel()},
      });
      // Japanese conjunction list format: "A、B、C" (Japanese comma separator)
      const cardsContainer = wrapper.find('.log-card').element.parentElement!;
      expect(cardsContainer.innerHTML).to.equal(
        '<span class="log-card background-color-automated">Algae</span>' +
        '、' +
        '<span class="log-card background-color-active">Birds</span>' +
        '、' +
      '<span class="log-card background-color-corporation">Celestic</span>',
      );
    } finally {
      PreferencesManager.resetForTest();
    }
  });

  it('renders icons in plain text and STRING data', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, 'spent :r:energy: for ${0}', [
      {type: LogMessageDataType.STRING, value: ':p:mc:'},
    ]);
    const wrapper = shallowMount(LogMessageComponent, {
      ...globalConfig,
      props: {message, viewModel: fakeViewModel()},
    });

    const html = wrapper.html();
    expect(html).includes('<span class="markdown-resource resource_icon--energy"></span>');
    expect(html).includes(
      '<span class="markdown-production"><span class="markdown-resource resource_icon--megacredits"></span></span>');
  });

  it('renders RESOURCE, PRODUCTION, and CARD_RESOURCE data as icons', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, '${0} ${1} ${2}', [
      {type: LogMessageDataType.RESOURCE, value: Resource.STEEL},
      {type: LogMessageDataType.PRODUCTION, value: Resource.HEAT},
      {type: LogMessageDataType.CARD_RESOURCE, value: CardResource.SYNDICATE_FLEET},
    ]);
    const wrapper = shallowMount(LogMessageComponent, {
      ...globalConfig,
      props: {message, viewModel: fakeViewModel()},
    });

    const html = wrapper.html();
    expect(html).includes('<span class="markdown-resource resource_icon--steel"></span>');
    expect(html).includes(
      '<span class="markdown-production"><span class="markdown-resource resource_icon--heat"></span></span>');
    expect(html).includes('<span class="markdown-resource card-resource-syndicate-fleet"></span>');
  });
});
