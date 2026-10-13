import {flushPromises, mount} from '@vue/test-utils';
import {defineComponent, nextTick, PropType} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import App from '@/client/components/App.vue';
import SelectProjectCardToPlay from '@/client/components/SelectProjectCardToPlay.vue';
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
    };
    const view = (waitingForId: string, gameAge: number) => Object.assign(fakePlayerViewModel({
      waitingFor: input, thisPlayer: fakePublicPlayerModel({megacredits: 50, heat: 4}), game: fakeGameModel({gameAge}),
    }), {waitingForId});
    let saved: SelectProjectCardToPlayResponse | undefined;
    const Home = defineComponent({
      components: {SelectProjectCardToPlay},
      props: {playerView: {type: Object as PropType<PlayerViewModel>, required: true}},
      setup: () => ({save: (response: SelectProjectCardToPlayResponse) => {saved = response;}}),
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
      expect(wrapper.get<HTMLInputElement>(`input[value="${CardName.BIRDS}"]`).element).not.eq(radio.element);
      expect(wrapper.get<HTMLInputElement>(`input[value="${CardName.ANTS}"]`).element.checked).is.true;
      tester.expectPayment({heat: 0, megacredits: 9});
    } finally {
      wrapper.unmount();
    }
  });
});
