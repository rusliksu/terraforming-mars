import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import NativeCreate from '@/client/components/create/CreateGameForm.vue';
import SourceCreate from '@/client/wrybit/create/CreateGameForm.vue';
import {CREATE_PRESENTATION, CreatePresentation} from '@/client/wrybit/create/presentation';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {encodeSettingsHash, decodeSettingsHash} from '@/client/components/create/settingsLink';
import {CreateGameSettingsStorage} from '@/client/components/create/CreateGameSettingsStorage';
import {TemplateManager} from '@/client/components/create/TemplateManager';
import {sharedEloState} from '@/client/utils/elo';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {BoardName} from '@/common/boards/BoardName';
import {paths} from '@/common/app/paths';

const {showAlert} = vi.hoisted(() => ({showAlert: vi.fn()}));
vi.mock('@/client/components/vueRoot', () => ({vueRoot: () => ({showAlert})}));

describe('public setup links through the permanent creation owner', () => {
  const originalUrl = window.location.href;
  beforeEach(() => {
    localStorage.clear();
    showAlert.mockClear();
    vi.stubGlobal('fetch', vi.fn((url: unknown) => Promise.resolve({ok: true, json: async () => url === paths.API_BOARD_PREVIEW ?
      {boardName: BoardName.THARSIS, spaces: [], randomExample: false} : {players: {}, games: []}})));
  });
  afterEach(() => {
    window.history.replaceState(null, '', originalUrl);
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sharedEloState.loaded = false;
    sharedEloState.players = {};
    sharedEloState.games = [];
  });

  function form(source = false) {
    const view = shallowRef<CreatePresentation | undefined>(source ? markRaw(SourceCreate) : undefined);
    const wrapper = mount(NativeCreate, {attachTo: document.body, global: {...globalConfig.global,
      stubs: {PreferencesIcon: true, PageToolbar: true},
      provide: {[CREATE_PRESENTATION as symbol]: computed(() => view.value)}}});
    const owner = wrapper.vm.$.proxy as InstanceType<typeof NativeCreate>;
    return {wrapper, owner, view, showAlert};
  }

  it('copies the source header link and restores its native settings with classic mode still selected', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {clipboard: {writeText}});
    const first = form(true);
    let link = '';
    try {
      await flushPromises();
      const owner = first.owner;
      owner.playersCount = 2;
      owner.players[0].name = 'Synthetic private seat';
      owner.players[0].profileId = 'synthetic-profile';
      owner.players[0].telegramID = '500001111';
      owner.board = BoardName.HELLAS;
      owner.shuffleMapOption = true;
      owner.undoStepOption = true;
      owner.randomFirstPlayer = false;
      owner.firstIndex = 2;
      owner.expansions.highOrbit = true;
      await flushPromises();
      owner.seed = 0.25;
      await first.wrapper.get('button[aria-label="Copy link with these settings"]').trigger('click');
      await flushPromises();
      expect(writeText.mock.calls).has.length(1);
      link = writeText.mock.calls[0][0];
      const url = new URL(link);
      expect(url.search).eq('');
      expect(url.hash).eq(window.location.hash);
      const decoded = decodeSettingsHash(url.hash)!;
      expect(JSON.stringify(decoded)).not.contains('Synthetic private seat');
      expect(JSON.stringify(decoded)).not.contains('synthetic-profile');
      expect(JSON.stringify(decoded)).not.contains('500001111');
      expect(first.wrapper.get('button[aria-label="Copy link with these settings"]').text()).eq('Link copied');
    } finally {
      first.wrapper.unmount();
    }

    const saved = defaultCreateGameModel();
    saved.board = BoardName.ELYSIUM;
    saved.preludeDraftVariant = false;
    new CreateGameSettingsStorage().saveSettings(TemplateManager.serializeFormState(saved));
    window.history.replaceState(null, '', link);
    const restored = form();
    try {
      await flushPromises();
      expect(restored.wrapper.find('.wrybit-create-form').exists()).is.false;
      expect(restored.owner.board).eq(BoardName.HELLAS);
      expect(restored.owner.shuffleMapOption).is.true;
      expect(restored.owner.undoStepOption).is.true;
      expect(restored.owner.expansions.highOrbit).is.true;
      expect(restored.owner.seed).eq(0.25);
      expect(restored.owner.firstIndex).eq(2);
      expect(restored.owner.playersCount).eq(2);
      expect(restored.owner.players.slice(0, 2).every((player) => player.name === '' && !player.profileId && !player.telegramID && !player.isBot)).is.true;
      expect(restored.owner.botGame).is.false;
      expect(restored.owner.turnBasedGame).is.false;
      expect(restored.showAlert.mock.calls).has.length(0);
    } finally {
      restored.wrapper.unmount();
    }
  });

  it('leaves saved settings intact for an invalid link and preserves explicit board-library query precedence', async () => {
    const saved = defaultCreateGameModel();
    saved.board = BoardName.HELLAS;
    new CreateGameSettingsStorage().saveSettings(TemplateManager.serializeFormState(saved));
    window.history.replaceState(null, '', '/new-game#tm-settings=1.invalid!');
    const invalid = form();
    try {
      await flushPromises();
      expect(invalid.owner.board).eq(BoardName.HELLAS);
      expect(invalid.showAlert.mock.calls).has.length(1);
    } finally {
      invalid.wrapper.unmount();
    }
    showAlert.mockClear();
    window.history.replaceState(null, '', '/new-game?board=elysium' + encodeSettingsHash(defaultCreateGameModel()));
    const library = form();
    try {
      await flushPromises();
      expect(library.owner.board).eq(BoardName.ELYSIUM);
      expect(library.showAlert.mock.calls).has.length(0);
    } finally {
      library.wrapper.unmount();
    }
  });

  it('keeps a usable address-bar link when clipboard permission is unavailable', async () => {
    vi.stubGlobal('navigator', {clipboard: {writeText: vi.fn().mockRejectedValue(new Error('Permission denied'))}});
    const current = form(true);
    try {
      await flushPromises();
      await current.wrapper.get('button[aria-label="Copy link with these settings"]').trigger('click');
      await flushPromises();
      expect(decodeSettingsHash(window.location.hash)).not.eq(undefined);
      expect(current.showAlert.mock.calls).deep.eq([['Copy link', 'Copy the settings link from the address bar.']]);
      expect(current.wrapper.get('button[aria-label="Copy link with these settings"]').text()).eq('Copy link');
    } finally {
      current.wrapper.unmount();
    }
  });
});
