import {flushPromises, mount} from '@vue/test-utils';
import {defineComponent, nextTick, PropType} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import App from '@/client/components/App.vue';
import SelectProjectCardToPlay from '@/client/components/SelectProjectCardToPlay.vue';
import WaitingFor from '@/client/components/WaitingFor.vue';
import settings from '@/genfiles/settings.json';
import {CardName} from '@/common/cards/CardName';
import {SelectProjectCardToPlayModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {SelectProjectCardToPlayResponse} from '@/common/inputs/InputResponse';
import {Payment} from '@/common/inputs/Payment';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {PaymentTester} from '@tests/client/components/PaymentTester';

describe('Wrybit current input refresh', () => {
  const originalFetch = global.fetch;
  let storage: FakeLocalStorage;

  beforeEach(() => {
    storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
    PreferencesManager.INSTANCE.set('experimental_layout', true);
    PreferencesManager.INSTANCE.set('show_alerts', false);
    window.history.replaceState({}, '', '/');
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    await vi.dynamicImportSettled();
    global.fetch = originalFetch;
    FakeLocalStorage.deregister(storage);
    PreferencesManager.resetForTest();
    window.history.replaceState({}, '', '/');
  });

  it('retains the real card/payment form during the same request and clears an identical new request', async () => {
    const input: SelectProjectCardToPlayModel = {
      type: 'projectCard', title: 'Select a card to play', buttonLabel: 'Save',
      cards: [{name: CardName.ANTS, calculatedCost: 9}, {name: CardName.BIRDS, calculatedCost: 10}],
      paymentOptions: {heat: true},
      microbes: 0, floaters: 0, lunaArchivesScience: 0, seeds: 0, graphene: 0,
      kuiperAsteroids: 0, auroraiData: 0, spireScience: 0, nereidMicrobes: 0, anyFloaters: 0,
    };
    const view = (waitingForId: string, gameAge: number) => Object.assign(fakePlayerViewModel({
      waitingFor: input, thisPlayer: fakePublicPlayerModel({megacredits: 50, heat: 4}), game: fakeGameModel({gameId: 'g-fixture', gameAge}),
    }), {waitingForId});
    let saved: SelectProjectCardToPlayResponse | undefined;
    const Home = defineComponent({
      components: {SelectProjectCardToPlay},
      props: {playerView: {type: Object as PropType<PlayerViewModel>, required: true}},
      setup: () => ({save: (response: SelectProjectCardToPlayResponse) => {
        saved = response;
      }}),
      template: '<SelectProjectCardToPlay :player-view="playerView" :playerinput="playerView.waitingFor" :onsave="save" :showsave="true" :showtitle="true" />',
    });
    const wrapper = mount(App, {
      global: {...globalConfig.global, stubs: {StartScreen: true, PlayerHome: Home, WrybitBoundary: true}},
    });
    try {
      wrapper.vm.playerView = view('pending-a', 1);
      wrapper.vm.screen = 'player-home';
      await flushPromises();
      const radio = wrapper.get<HTMLInputElement>(`input[type="radio"][value="${CardName.BIRDS}"]`);
      await radio.setValue(true);
      const tester = new PaymentTester(wrapper);
      await tester.clickMax('heat');
      tester.expectPayment({heat: 4, megacredits: 6});

      window.history.replaceState({}, '', '/player?id=p-blue-id&noredirect');
      let latest = view('pending-a', 2);
      global.fetch = vi.fn(async () => new Response(JSON.stringify(latest), {status: 200}));
      wrapper.vm.updatePlayer();
      await flushPromises();
      expect(wrapper.get<HTMLInputElement>(`input[value="${CardName.BIRDS}"]`).element.checked).is.true;
      expect(wrapper.get<HTMLInputElement>(`input[value="${CardName.BIRDS}"]`).element).eq(radio.element);
      tester.expectPayment({heat: 4, megacredits: 6});

      PreferencesManager.INSTANCE.set('experimental_layout', false);
      await nextTick();
      expect(radio.element.checked).is.true;
      await tester.clickSave();
      expect(saved).deep.eq({type: 'projectCard', card: CardName.BIRDS, payment: Payment.of({heat: 4, megacredits: 6})});

      PreferencesManager.INSTANCE.set('experimental_layout', true);
      latest = view('pending-b', 2);
      wrapper.vm.updatePlayer();
      await flushPromises();
      expect(wrapper.get<HTMLInputElement>(`input[value="${CardName.ANTS}"]`).element.checked).is.true;
      expect(wrapper.get<HTMLInputElement>(`input[value="${CardName.BIRDS}"]`).element).not.eq(radio.element);
      tester.expectPayment({heat: 0, megacredits: 9});
    } finally {
      wrapper.unmount();
    }
  });

  it('continues polling from the refreshed model while retaining an optional input', async () => {
    vi.useFakeTimers();
    class PollRequest {
      public static requests: Array<PollRequest> = [];
      public url = '';
      public status = 200;
      public response = {result: 'REFRESH', waitingFor: []};
      public onload: () => void = () => {};
      public open(_method: string, url: string) {
        this.url = url;
      }
      public send() {
        PollRequest.requests.push(this);
      }
    }
    vi.stubGlobal('XMLHttpRequest', PollRequest);
    const view = (gameAge: number) => Object.assign(fakePlayerViewModel({
      waitingFor: {type: 'option', title: 'Confirm', buttonLabel: 'Confirm', optional: true},
      game: fakeGameModel({gameId: 'g-fixture', gameAge}),
    }), {waitingForId: 'pending-a'});
    const Home = defineComponent({
      components: {WaitingFor},
      props: {playerView: {type: Object as PropType<PlayerViewModel>, required: true}},
      template: '<WaitingFor :player-view="playerView" :waitingfor="playerView.waitingFor" />',
    });
    const wrapper = mount(App, {
      global: {...globalConfig.global, stubs: {StartScreen: true, PlayerHome: Home, WrybitBoundary: true, PlayerInputFactory: true}},
    });
    try {
      wrapper.vm.playerView = view(1);
      wrapper.vm.screen = 'player-home';
      // VTU adds a root wrapper; forward to the real App.
      const root = wrapper.vm.$root;
      if (root === null) {
        throw new Error('Missing VTU root');
      }
      Object.assign(root, {updatePlayer: () => wrapper.vm.updatePlayer()});
      await nextTick();
      window.history.replaceState({}, '', '/player?id=p-blue-id&noredirect');
      global.fetch = vi.fn(async () => new Response(JSON.stringify(view(2)), {status: 200}));
      await vi.advanceTimersByTimeAsync(settings.waitingForTimeout);
      expect(PollRequest.requests).has.length(1);
      PollRequest.requests[0].onload();
      await flushPromises();
      await vi.advanceTimersByTimeAsync(settings.waitingForTimeout);
      expect(PollRequest.requests).has.length(2);
      expect(PollRequest.requests[1].url).eq('api/waitingfor?id=p-blue-id&noredirect&gameAge=2&undoCount=0');
    } finally {
      wrapper.unmount();
    }
  });
});
