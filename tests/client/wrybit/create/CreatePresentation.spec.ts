import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import NativeCreate from '@/client/components/create/CreateGameForm.vue';
import SourceCreate from '@/client/wrybit/create/CreateGameForm.vue';
import CardsFilter from '@/client/components/create/CardsFilter.vue';
import {CREATE_CONTROLS, CREATE_PRESENTATION, CreatePresentation} from '@/client/wrybit/create/presentation';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import SeatIcon from '@/client/wrybit/visuals/common/SeatIcon.vue';
import NumberStepper from '@/client/wrybit/create/NumberStepper.vue';
import SwitchInput from '@/client/wrybit/create/SwitchInput.vue';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {sharedEloState} from '@/client/utils/elo';
import {globalConfig} from '@tests/client/components/getLocalVue';

type FetchOptions = NonNullable<Parameters<typeof window.fetch>[1]>;

describe('source creation view with our permanent form owner', () => {
  it('sends the same native serialized request through the source Create button', async () => {
    localStorage.clear();
    const requests: FetchOptions[] = [];
    const fetch = vi.fn((_url: unknown, init?: FetchOptions) => {
      if (init?.method === 'POST') {
        requests.push(init);
        // The HTTP boundary captures the request; this test does not create a game.
        return new Promise<Response>(() => {});
      }
      return Promise.resolve({ok: true, json: async () => ({players: {}, games: []})});
    });
    vi.stubGlobal('fetch', fetch);
    const view = shallowRef<CreatePresentation>();
    const wrapper = mount(NativeCreate, {attachTo: document.body, global: {...globalConfig.global,
      stubs: {PreferencesIcon: true, PageToolbar: true},
      provide: {[CREATE_PRESENTATION as symbol]: computed(() => view.value)}}});
    try {
      await flushPromises();
      await wrapper.get('input[name=playersCount][value="2"]').setValue(true);
      const names = wrapper.findAll('.create-game-player-name');
      await names[0].setValue('Synthetic Alice');
      await names[1].setValue('Synthetic Bob');
      await wrapper.get('#randomFirstPlayer-checkbox').setValue(false);
      await wrapper.get('#noEloGame-checkbox').setValue(true);
      const owner = wrapper.vm.$.proxy as InstanceType<typeof NativeCreate>;
      const expected = await owner.serializeSettings();
      expect(expected).is.a('string');
      view.value = markRaw(SourceCreate);
      await flushPromises();
      expect(requests).has.length(0);
      await wrapper.get('.expansion-group-menu > button').trigger('click');
      const grouping = wrapper.findAll('.expansion-group-menu button[role=option]').find((button) => button.text() === 'Corporations')!;
      await grouping.trigger('click');
      expect(wrapper.text()).contains('With corporations');
      expect(requests).has.length(0);
      await wrapper.get('.create-game-create-row .create-game-create').trigger('click');
      await flushPromises();
      expect(requests).has.length(1);
      expect(requests[0].body).eq(expected);
      const payload = JSON.parse(String(requests[0].body));
      expect(payload.noEloGame).is.true;
      expect(payload.players.map((player: {name: string}) => player.name)).deep.eq(['Synthetic Alice', 'Synthetic Bob']);
      expect(payload).not.has.property('aiPlayersCount');
      expect(payload.players[0]).not.has.property('aiLevel');
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
      localStorage.clear();
      sharedEloState.loaded = false;
      sharedEloState.players = {};
      sharedEloState.games = [];
    }
  });

  it('retains profile, file, custom map draft, filter and native AI fields through both layout changes', async () => {
    localStorage.clear();
    const fetch = vi.fn().mockResolvedValue({ok: true, json: async () => ({players: {}, games: []})});
    vi.stubGlobal('fetch', fetch);
    const view = shallowRef<CreatePresentation>();
    const controls = {cube: markRaw(PlayerCube), seat: markRaw(SeatIcon), stepper: markRaw(NumberStepper), toggle: markRaw(SwitchInput)};
    const wrapper = mount(NativeCreate, {attachTo: document.body, global: {...globalConfig.global,
      stubs: {PreferencesIcon: true, PageToolbar: true},
      provide: {[CREATE_PRESENTATION as symbol]: computed(() => view.value),
        [CREATE_CONTROLS as symbol]: computed(() => view.value === undefined ? undefined : controls)}}});
    try {
      await flushPromises();
      const owner = wrapper.vm.$.proxy as InstanceType<typeof NativeCreate>;
      const uid = owner.$.uid;
      await wrapper.get('input[name=playersCount][value="2"]').setValue(true);
      const names = wrapper.findAll('.create-game-player-name');
      await names[0].setValue('Synthetic owner');
      await names[1].setValue('Synthetic bot');
      await wrapper.get('#botGame-checkbox').setValue(true);
      await wrapper.get('#turnBasedGame-checkbox').setValue(true);
      await wrapper.get('#noEloGame-checkbox').setValue(true);
      const bot = wrapper.findAll('label.form-switch').find((label) => label.text() === 'Bot')!;
      await bot.get('input').setValue(true);
      await wrapper.get('#custom-map-code').setValue('unfinished map draft');
      await wrapper.get('#bannedCards-checkbox').setValue(true);
      const filter = wrapper.getComponent(CardsFilter);
      await filter.get('input').setValue('Asteroid');
      const player = owner.players[0];
      const nameInput = names[0].element;
      const fileInput = wrapper.get('input[type=file]').element;
      const mapInput = wrapper.get('#custom-map-code').element;
      const filterId = filter.vm.$.uid;
      const config = JSON.stringify(owner.newGameConfig);
      const errors = JSON.stringify(owner.validationErrors);
      expect(Object.keys(owner.creationBinding.model).sort()).deep.eq(Object.keys(defaultCreateGameModel()).sort());
      const callsBeforeMode = fetch.mock.calls.length;
      view.value = markRaw(SourceCreate);
      await flushPromises();
      expect(wrapper.find('.create-game-cards').exists()).is.true;
      expect(owner.$.uid).eq(uid);
      expect(owner.players[0]).eq(player);
      expect(wrapper.get('.create-game-player-name').element).eq(nameInput);
      expect(wrapper.get('input[type=file]').element).eq(fileInput);
      expect(wrapper.get('#custom-map-code').element).eq(mapInput);
      expect(wrapper.getComponent(CardsFilter).vm.$.uid).eq(filterId);
      expect(wrapper.getComponent(CardsFilter).vm.searchTerm).eq('Asteroid');
      expect(JSON.stringify(owner.newGameConfig)).eq(config);
      expect(JSON.stringify(owner.validationErrors)).eq(errors);
      expect(owner.players[0].isBot).is.true;
      expect(wrapper.findAllComponents(SeatIcon).some((seat) => seat.props('kind') === 'ai')).is.true;
      expect(owner.turnBasedGame).is.true;
      expect(fetch.mock.calls.length).eq(callsBeforeMode);
      const training = wrapper.findAll('.create-game-option').find((row) => row.text().includes('Training game (no ELO)'))!;
      await training.get('input').setValue(false);
      expect(owner.noEloGame).is.false;
      view.value = undefined;
      await flushPromises();
      expect(wrapper.get('.create-game-player-name').element).eq(nameInput);
      expect(wrapper.getComponent(CardsFilter).vm.$.uid).eq(filterId);
      expect(owner.customBoardCodeInput).eq('unfinished map draft');
      expect(owner.players[0]).eq(player);
      expect(owner.noEloGame).is.false;
      expect(fetch.mock.calls.length).eq(callsBeforeMode);
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
      localStorage.clear();
      sharedEloState.loaded = false;
      sharedEloState.players = {};
      sharedEloState.games = [];
    }
  });
});
