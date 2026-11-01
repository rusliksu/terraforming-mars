import {flushPromises, mount} from '@vue/test-utils';
import {defineComponent, markRaw, nextTick} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import App from '@/client/components/App.vue';
import PlayerHome from '@/client/wrybit/visuals/PlayerHome.vue';
import InputHost from '@/client/wrybit/shell/InputHost.vue';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import WaitingFor from '@/client/components/WaitingFor.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {PaymentTester} from '@tests/client/components/PaymentTester';
import {SelectProjectCardToPlayModel} from '@/common/models/PlayerInputModel';
import {CardName} from '@/common/cards/CardName';
import NativeCard from '@/client/components/SelectCard.vue';
import {Phase} from '@/common/Phase';
import type {SelectCardModel} from '@/common/models/PlayerInputModel';

describe('App Wrybit player root', () => {
  let storage: FakeLocalStorage;
  beforeEach(() => {
    storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
    window.history.replaceState({}, '', '/');
  });
  afterEach(async () => {
    await vi.dynamicImportSettled();
    vi.unstubAllGlobals();
    FakeLocalStorage.deregister(storage);
    PreferencesManager.resetForTest();
  });

  it('collapses the setup board without remounting it or changing the native pending choice', async () => {
    const Classic = defineComponent({
      components: {InputHost},
      props: {playerView: {type: Object, default: undefined}},
      template: '<section data-classic-root><InputHost/></section>',
    });
    const Boundary = defineComponent({
      props: {enabled: {type: Boolean, default: false}, screen: {type: String, default: ''}},
      emits: ['classic', 'active', 'views'],
      template: '<div/>',
    });
    const input: SelectCardModel = {type: 'card', title: 'Select initial cards to buy', buttonLabel: 'Buy', min: 0, max: 2,
      cards: [{name: CardName.ANTS}, {name: CardName.BIRDS}], showOnlyInLearnerMode: false, selectBlueCardAction: false,
      showOwner: false, showSelectAll: false};
    const view = fakePlayerViewModel({waitingFor: input, thisPlayer: fakePublicPlayerModel({tableau: []}),
      game: fakeGameModel({phase: Phase.RESEARCH})});
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const wrapper = mount(App, {global: {...globalConfig.global, components: {PlayerInputFactory}, stubs: {
      StartScreen: true, PlayerHome: Classic, WrybitBoundary: Boundary, TopBar: true,
      GameBoardView: {template: '<div data-setup-board-fixture/>'}, LogPanel: true, HandCardsPanel: true,
      KeyboardShortcuts: true, PurgeWarning: true, GameMenu: true, CardListSection: true,
    }}});
    try {
      wrapper.vm.applyPlayerView(view);
      wrapper.vm.screen = 'player-home';
      await flushPromises();
      localStorage.setItem('setup-board-collapsed', 'original');
      await wrapper.getComponent(NativeCard).findAll('input[type="checkbox"]')[0].setValue(true);
      const owner = wrapper.getComponent(NativeCard).vm;
      const uid = owner.$.uid;
      wrapper.getComponent(Boundary).vm.$emit('views', {playerHome: markRaw(PlayerHome)});
      wrapper.getComponent(Boundary).vm.$emit('active', true);
      PreferencesManager.INSTANCE.set('experimental_layout', true);
      await flushPromises();
      const board = wrapper.get('[data-setup-board-fixture]').element;
      await wrapper.get('.setup-board-toggle').trigger('click');
      expect(wrapper.get('.player-home-columns').classes()).contains('player-home-columns--board-collapsed');
      expect(wrapper.get('[data-setup-board-fixture]').element).eq(board);
      expect(wrapper.getComponent(NativeCard).vm.$.uid).eq(uid);
      expect(owner.getData()).deep.eq([CardName.ANTS]);
      expect(localStorage.getItem('wrybit.setup-board-collapsed')).eq('1');
      expect(localStorage.getItem('setup-board-collapsed')).eq('original');
      await wrapper.get('.setup-board-toggle').trigger('click');
      expect(wrapper.get('.player-home-columns').classes()).not.contains('player-home-columns--board-collapsed');
      wrapper.getComponent(Boundary).vm.$emit('classic');
      await flushPromises();
      expect(wrapper.getComponent(NativeCard).vm.$.uid).eq(uid);
      expect(owner.getData()).deep.eq([CardName.ANTS]);
      expect(fetch.mock.calls).has.length(0);
    } finally {
      const toggle = wrapper.find('.setup-board-toggle');
      if (toggle.exists() && toggle.attributes('aria-pressed') === 'true') {
        await toggle.trigger('click');
      }
      wrapper.unmount();
    }
  });

  it('moves our card and payment form into the real Wrybit root and back without a save or reset', async () => {
    const Classic = defineComponent({
      components: {InputHost},
      props: {playerView: {type: Object, default: undefined}},
      template: '<section data-classic-root><InputHost/></section>',
    });
    const Boundary = defineComponent({
      props: {enabled: {type: Boolean, default: false}, screen: {type: String, default: ''}},
      emits: ['classic', 'active', 'views'],
      template: '<div/>',
    });
    const input: SelectProjectCardToPlayModel = {
      type: 'projectCard', title: 'Select a card to play', buttonLabel: 'Save',
      cards: [{name: CardName.ANTS, calculatedCost: 9}, {name: CardName.BIRDS, calculatedCost: 10}],
      paymentOptions: {heat: true}, microbes: 0, floaters: 0, lunaArchivesScience: 0, seeds: 0, graphene: 0,
      kuiperAsteroids: 0, auroraiData: 0, spireScience: 0, nereidMicrobes: 0, anyFloaters: 0,
    };
    const view = fakePlayerViewModel({waitingForId: 'pending-root-choice', waitingFor: input, thisPlayer: fakePublicPlayerModel({
      megacredits: 50, heat: 4, tableau: [{name: CardName.HELION}],
    }), game: fakeGameModel({gameId: 'g-fixture'})});
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const wrapper = mount(App, {global: {...globalConfig.global, components: {PlayerInputFactory}, stubs: {
      StartScreen: true, PlayerHome: Classic, WrybitBoundary: Boundary,
      TopBar: true, PlayersOverview: true, GameBoardView: true, LogPanel: true, HandCardsPanel: true,
      KeyboardShortcuts: true, PurgeWarning: true,
    }}});
    try {
      wrapper.vm.applyPlayerView(view);
      wrapper.vm.screen = 'player-home';
      await flushPromises();
      const radio = wrapper.get<HTMLInputElement>('input[value="Birds"]');
      await radio.setValue(true);
      const tester = new PaymentTester(wrapper);
      await tester.clickMax('heat');
      tester.expectPayment({heat: 4, megacredits: 6});
      const waiting = wrapper.getComponent(WaitingFor).vm.$.uid;
      wrapper.getComponent(Boundary).vm.$emit('views', {playerHome: markRaw(PlayerHome)});
      wrapper.getComponent(Boundary).vm.$emit('active', true);
      await nextTick();
      expect(wrapper.find('.player-home-columns').exists()).is.false;
      PreferencesManager.INSTANCE.set('experimental_layout', true);
      await flushPromises();
      expect(wrapper.find('.player-home-columns').exists()).is.true;
      expect(wrapper.find('[data-classic-root]').exists()).is.false;
      expect(wrapper.get<HTMLInputElement>('#player-home input[value="Birds"]').element).eq(radio.element);
      expect(wrapper.getComponent(WaitingFor).vm.$.uid).eq(waiting);
      tester.expectPayment({heat: 4, megacredits: 6});
      expect(wrapper.findAll('[data-player-input-host]')).has.length(1);
      expect(wrapper.findAllComponents(WaitingFor)).has.length(1);
      expect(fetch.mock.calls).has.length(0);
      wrapper.vm.applyPlayerView(JSON.parse(JSON.stringify(view)));
      await flushPromises();
      expect(wrapper.getComponent(WaitingFor).vm.$.uid).eq(waiting);
      expect(radio.element.checked).is.true;
      tester.expectPayment({heat: 4, megacredits: 6});
      wrapper.getComponent(Boundary).vm.$emit('classic');
      await flushPromises();
      expect(wrapper.find('.player-home-columns').exists()).is.false;
      expect(wrapper.get<HTMLInputElement>('[data-classic-root] input[value="Birds"]').element).eq(radio.element);
      expect(wrapper.getComponent(WaitingFor).vm.$.uid).eq(waiting);
      tester.expectPayment({heat: 4, megacredits: 6});
      expect(fetch.mock.calls).has.length(0);
    } finally {
      wrapper.unmount();
    }
  });
});
