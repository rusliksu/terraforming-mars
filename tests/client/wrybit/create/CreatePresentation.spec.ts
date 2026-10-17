import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import NativeCreate from '@/client/components/create/CreateGameForm.vue';
import SourceCreate from '@/client/wrybit/create/CreateGameForm.vue';
import CardsFilter from '@/client/components/create/CardsFilter.vue';
import CorporationsFilter from '@/client/components/create/CorporationsFilter.vue';
import {CREATE_CONTROLS, CREATE_PRESENTATION, CreatePresentation} from '@/client/wrybit/create/presentation';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import SeatIcon from '@/client/wrybit/visuals/common/SeatIcon.vue';
import NumberStepper from '@/client/wrybit/create/NumberStepper.vue';
import SwitchInput from '@/client/wrybit/create/SwitchInput.vue';
import SourceModuleFilter from '@/client/wrybit/create/ModuleItemFilter.vue';
import SourceCardsFilter from '@/client/wrybit/create/CardsFilter.vue';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {sharedEloState} from '@/client/utils/elo';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {paths} from '@/common/app/paths';
import {BoardName} from '@/common/boards/BoardName';
import {RandomBoardOption} from '@/common/boards/RandomBoardOption';

type FetchOptions = NonNullable<Parameters<typeof window.fetch>[1]>;
function publicResponse(url: unknown) {
  return {ok: true, json: async () => url === paths.API_BOARD_PREVIEW ?
    {boardName: BoardName.THARSIS, spaces: [], randomExample: false} : {players: {}, games: []}};
}
const controls = {cube: markRaw(PlayerCube), seat: markRaw(SeatIcon), stepper: markRaw(NumberStepper),
  toggle: markRaw(SwitchInput), moduleFilter: markRaw(SourceModuleFilter), cardsFilter: markRaw(SourceCardsFilter)};

describe('source creation view with our permanent form owner', () => {
  it('shows the native Venus editor with only Venus Phase 2 enabled and retains its draft on classic return', async () => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn((url: unknown) => Promise.resolve(publicResponse(url))));
    const view = shallowRef<CreatePresentation>();
    const wrapper = mount(NativeCreate, {attachTo: document.body, global: {...globalConfig.global,
      stubs: {PreferencesIcon: true, PageToolbar: true},
      provide: {[CREATE_PRESENTATION as symbol]: computed(() => view.value)}}});
    try {
      await flushPromises();
      const owner = wrapper.vm.$.proxy as InstanceType<typeof NativeCreate>;
      expect([owner.expansions.venus, owner.expansions.turmoil, owner.expansions.moon, owner.expansions.ares]).deep.eq([false, false, false, false]);
      const editor = wrapper.get('#custom-venus-board-code').element;
      view.value = markRaw(SourceCreate);
      await flushPromises();
      const chip = wrapper.findAll('.create-game-expansion-grid .create-game-chip').find((item) => item.find('.expansion-icon-venusPhase2').exists())!;
      await chip.trigger('click');
      await flushPromises();
      expect(owner.expansions.venusPhase2).is.true;
      const sourceEditor = wrapper.get('.create-game-collapsible #custom-venus-board-code');
      expect(sourceEditor.element).eq(editor);
      await wrapper.findAll('button').find((button) => button.text() === 'Expansion options')!.trigger('click');
      expect(sourceEditor.isVisible()).is.true;
      await sourceEditor.setValue('synthetic invalid Venus board draft');
      expect(owner.newGameConfig.expansions.venusPhase2).is.true;
      const config = JSON.stringify(owner.newGameConfig);
      view.value = undefined;
      await flushPromises();
      expect(wrapper.get('#custom-venus-board-code').element).eq(editor);
      expect((editor as HTMLTextAreaElement).value).eq('synthetic invalid Venus board draft');
      expect(JSON.stringify(owner.newGameConfig)).eq(config);
      expect([owner.expansions.venus, owner.expansions.turmoil, owner.expansions.moon, owner.expansions.ares]).deep.eq([false, false, false, false]);
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
      localStorage.clear();
      sharedEloState.loaded = false;
      sharedEloState.players = {};
      sharedEloState.games = [];
    }
  });

  it('shows our blocking validation inline without losing invalid values on classic return', async () => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn((url: unknown) => Promise.resolve(publicResponse(url))));
    const view = shallowRef<CreatePresentation>();
    const wrapper = mount(NativeCreate, {attachTo: document.body, global: {...globalConfig.global,
      stubs: {PreferencesIcon: true, PageToolbar: true},
      provide: {[CREATE_PRESENTATION as symbol]: computed(() => view.value)}}});
    try {
      await flushPromises();
      await wrapper.get('#escapevelocity-checkbox').setValue(true);
      await wrapper.get('#escapeThreshold-checkbox').setValue(-1);
      view.value = markRaw(SourceCreate);
      await flushPromises();
      expect(wrapper.get('.create-game-validation-box--error').text()).contains('Escape Velocity values cannot be negative.');
      expect((wrapper.get('.create-game-create').element as HTMLButtonElement).disabled).is.true;
      expect(wrapper.find('.create-game-validation-popup').exists()).is.false;
      view.value = undefined;
      await flushPromises();
      expect((wrapper.get('#escapeThreshold-checkbox').element as HTMLInputElement).value).eq('-1');
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
      localStorage.clear();
      sharedEloState.loaded = false;
      sharedEloState.players = {};
      sharedEloState.games = [];
    }
  });

  it('requests public geometry only while the source view is active and excludes player fields', async () => {
    localStorage.clear();
    vi.useFakeTimers();
    const previews: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn((url: unknown, init?: FetchOptions) => {
      if (url === paths.API_BOARD_PREVIEW) {
        previews.push(JSON.parse(String(init?.body)));
      }
      return Promise.resolve(publicResponse(url));
    }));
    const view = shallowRef<CreatePresentation>();
    const wrapper = mount(NativeCreate, {attachTo: document.body, global: {...globalConfig.global,
      stubs: {PreferencesIcon: true, PageToolbar: true},
      provide: {[CREATE_PRESENTATION as symbol]: computed(() => view.value)}}});
    try {
      await flushPromises();
      await vi.advanceTimersByTimeAsync(250);
      expect(previews).has.length(0);
      view.value = markRaw(SourceCreate);
      await flushPromises();
      await vi.advanceTimersByTimeAsync(250);
      await flushPromises();
      expect(previews).has.length(1);
      expect(Object.keys(previews[0]).sort()).deep.eq(['board', 'expansions', 'includedCards', 'seed', 'shuffleMapOption']);
      expect(wrapper.find('.create-game-board-preview').exists()).is.true;
      await wrapper.get('.create-game-player-name').setValue('Synthetic preview owner');
      await vi.advanceTimersByTimeAsync(250);
      expect(previews).has.length(1);
      const owner = wrapper.vm.$.proxy as InstanceType<typeof NativeCreate>;
      const initialSeed = owner.seed;
      owner.shuffleMapOption = true;
      await flushPromises();
      await vi.advanceTimersByTimeAsync(250);
      expect(owner.seed).eq(initialSeed);
      const random = vi.spyOn(Math, 'random').mockReturnValue(0.875);
      owner.redrawBoardPreview();
      await flushPromises();
      await vi.advanceTimersByTimeAsync(250);
      expect(owner.seed).eq(0.875);
      owner.board = RandomBoardOption.OFFICIAL;
      await flushPromises();
      await vi.advanceTimersByTimeAsync(250);
      owner.redrawBoardPreview();
      await vi.advanceTimersByTimeAsync(250);
      expect(owner.seed).eq(0.875);
      random.mockRestore();
      expect(previews).has.length(5);
      owner.seededGame = true;
      await flushPromises();
      await vi.advanceTimersByTimeAsync(250);
      expect(wrapper.find('.create-game-board-preview').exists()).is.false;
      expect(previews).has.length(5);
      view.value = undefined;
      await flushPromises();
      await vi.advanceTimersByTimeAsync(250);
      owner.redrawBoardPreview();
      expect(owner.seed).eq(0.875);
      expect(previews).has.length(5);
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      vi.useRealTimers();
      localStorage.clear();
      sharedEloState.loaded = false;
      sharedEloState.players = {};
      sharedEloState.games = [];
    }
  });

  it('keeps our corporation editor and its selection through Show, Edit and classic mode', async () => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn((url: unknown) => Promise.resolve(publicResponse(url))));
    const view = shallowRef<CreatePresentation>();
    const wrapper = mount(NativeCreate, {attachTo: document.body, global: {...globalConfig.global,
      stubs: {PreferencesIcon: true, PageToolbar: true},
      provide: {[CREATE_PRESENTATION as symbol]: computed(() => view.value),
        [CREATE_CONTROLS as symbol]: computed(() => view.value === undefined ? undefined : controls)}}});
    try {
      await flushPromises();
      await wrapper.get('#customCorps-checkbox').setValue(true);
      const filter = wrapper.getComponent(CorporationsFilter).getComponent({name: 'ModuleItemFilter'});
      const filterId = filter.vm.$.uid;
      await filter.get('input.filter').setValue('Helion');
      const helion = filter.findAll('label.form-checkbox').find((label) => label.text() === 'Helion')!;
      await helion.get('input').setValue(false);
      const owner = wrapper.vm.$.proxy as InstanceType<typeof NativeCreate>;
      const selected = [...owner.customCorporations];
      const config = JSON.stringify(owner.newGameConfig);
      view.value = markRaw(SourceCreate);
      await flushPromises();
      const card = wrapper.get('.create-game-custom-list');
      expect(card.text()).contains('Removed');
      expect(wrapper.getComponent(CorporationsFilter).getComponent({name: 'ModuleItemFilter'}).vm.$.uid).eq(filterId);
      await card.findAll('button[role=radio]').find((button) => button.text() === 'Edit')!.trigger('click');
      expect(wrapper.find('.module-item-filter--embedded').exists()).is.true;
      expect(wrapper.getComponent({name: 'ModuleItemFilter'}).get('input.filter').element.getAttribute('type')).not.eq('hidden');
      expect((wrapper.getComponent({name: 'ModuleItemFilter'}).get('input.filter').element as HTMLInputElement).value).eq('Helion');
      const sourceHelion = wrapper.getComponent({name: 'ModuleItemFilter'}).findAll('label.form-checkbox').find((label) => label.text() === 'Helion')!;
      await sourceHelion.get('input').setValue(true);
      expect(owner.customCorporations).contains('Helion');
      await sourceHelion.get('input').setValue(false);
      await wrapper.getComponent({name: 'ModuleItemFilter'}).get('input.filter').setValue('Hel');
      await card.findAll('button[role=radio]').find((button) => button.text() === 'Show')!.trigger('click');
      expect(owner.customCorporations).deep.eq(selected);
      expect(JSON.stringify(owner.newGameConfig)).eq(config);
      view.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent({name: 'ModuleItemFilter'}).vm.$.uid).eq(filterId);
      expect((wrapper.getComponent({name: 'ModuleItemFilter'}).get('input.filter').element as HTMLInputElement).value).eq('Hel');
      expect(owner.customCorporations).deep.eq(selected);
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
      localStorage.clear();
      sharedEloState.loaded = false;
      sharedEloState.players = {};
      sharedEloState.games = [];
    }
  });

  it('sends the same native serialized request through the source Create button', async () => {
    localStorage.clear();
    const requests: FetchOptions[] = [];
    const fetch = vi.fn((_url: unknown, init?: FetchOptions) => {
      if (_url === paths.API_CREATEGAME && init?.method === 'POST') {
        requests.push(init);
        // The HTTP boundary captures the request; this test does not create a game.
        return new Promise<Response>(() => {});
      }
      return Promise.resolve(publicResponse(_url));
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
    const fetch = vi.fn((url: unknown) => Promise.resolve(publicResponse(url)));
    vi.stubGlobal('fetch', fetch);
    const view = shallowRef<CreatePresentation>();
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
      const nonPreviewCalls = () => fetch.mock.calls.filter(([url]) => url !== paths.API_BOARD_PREVIEW).length;
      const callsBeforeMode = nonPreviewCalls();
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
      expect(nonPreviewCalls()).eq(callsBeforeMode);
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
      expect(nonPreviewCalls()).eq(callsBeforeMode);
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
      localStorage.clear();
      sharedEloState.loaded = false;
      sharedEloState.players = {};
      sharedEloState.games = [];
    }
  });

  it('uses native search and selection for source card previews and keyboard edits', async () => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn((url: unknown) => Promise.resolve(publicResponse(url))));
    const view = shallowRef<CreatePresentation>();
    const wrapper = mount(NativeCreate, {attachTo: document.body, global: {...globalConfig.global,
      stubs: {PreferencesIcon: true, PageToolbar: true},
      provide: {[CREATE_PRESENTATION as symbol]: computed(() => view.value),
        [CREATE_CONTROLS as symbol]: computed(() => view.value === undefined ? undefined : controls)}}});
    try {
      await flushPromises();
      await wrapper.get('#bannedCards-checkbox').setValue(true);
      const filter = wrapper.getComponent(CardsFilter);
      const input = filter.get('input').element;
      await filter.get('input').setValue('Asteroid');
      const matches = [...filter.vm.searchMatches];
      expect(matches).has.length(5);
      view.value = markRaw(SourceCreate);
      await flushPromises();
      expect(wrapper.getComponent(CardsFilter).get('input').element).eq(input);
      expect(wrapper.findAll('.cards-filter-suggest .wrybit-card')).has.length(5);
      await filter.get('input').trigger('keydown', {key: 'ArrowDown'});
      await filter.get('input').trigger('keydown', {key: 'Enter'});
      const owner = wrapper.vm.$.proxy as InstanceType<typeof NativeCreate>;
      expect(owner.bannedCards).deep.eq([matches[1]]);
      expect(document.activeElement).eq(input);
      expect(filter.vm.searchTerm).eq('');
      expect(wrapper.findAll('.cards-filter-selected .wrybit-card')).has.length(1);
      view.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent(CardsFilter).get('input').element).eq(input);
      expect(filter.vm.selected).deep.eq([matches[1]]);
      view.value = markRaw(SourceCreate);
      await flushPromises();
      await wrapper.get('.cards-filter-selected .create-game-card-grid-remove').trigger('click');
      expect(owner.bannedCards).deep.eq([]);
      await filter.get('input').setValue('Acquired Company,Adapted Lichen');
      expect(owner.bannedCards).deep.eq(['Acquired Company', 'Adapted Lichen']);
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
