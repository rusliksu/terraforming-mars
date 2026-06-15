import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';
import {sharedEloState} from '@/client/utils/elo';
import {ColonyName} from '@/common/colonies/ColonyName';
import {CardName} from '@/common/cards/CardName';
import {
  DEFAULT_PLAYER_COLORS,
} from '@/common/Color';

describe('CreateGameForm', () => {
  let originalFetch: typeof fetch;
  let originalUrl: string;
  let originalMatchMedia: typeof window.matchMedia;
  let originalFocus: typeof window.HTMLInputElement.prototype.focus;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalUrl = window.location.href;
    originalMatchMedia = window.matchMedia;
    originalFocus = window.HTMLInputElement.prototype.focus;
    global.localStorage = window.localStorage;
    window.localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.replaceState({}, '', originalUrl);
    window.matchMedia = originalMatchMedia;
    window.HTMLInputElement.prototype.focus = originalFocus;
    window.localStorage.clear();
    sharedEloState.loaded = false;
    sharedEloState.failed = false;
    sharedEloState.players = {};
    sharedEloState.games = [];
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
    const text = wrapper.text();
    expect(text).to.contain('Knightbyte server settings');
    expect(text.indexOf('Knightbyte server settings')).to.be.lessThan(text.indexOf('Training game (no ELO)'));
    expect(text.indexOf('Training game (no ELO)')).to.be.lessThan(text.indexOf('Async game (Telegram)'));
    expect(text.indexOf('Async game (Telegram)')).to.be.lessThan(text.indexOf('Bot players'));
    expect(text.indexOf('Bot players')).to.be.lessThan(text.indexOf('Filter'));
    expect(wrapper.text()).not.to.contain('/start');
  });

  it('serializes private hands setting', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    expect(wrapper.text()).to.contain('Private hands');

    let serialized = await (wrapper.vm as any).serializeSettings();
    let payload = JSON.parse(serialized);
    expect(payload.privateHands).eq(true);

    await wrapper.setData({privateHands: false});

    serialized = await (wrapper.vm as any).serializeSettings();
    payload = JSON.parse(serialized);
    expect(payload.privateHands).eq(false);
  });

  it('serializes one-way 10-card initial draft setting', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    await wrapper.setData({playersCount: 2, initialDraft: true, initialDraftOneWay: true});
    expect(wrapper.text()).to.contain('10-card one-way initial draft');

    const serialized = await (wrapper.vm as any).serializeSettings();
    const payload = JSON.parse(serialized);

    expect(payload.initialDraft).eq(true);
    expect(payload.initialDraftOneWay).eq(true);
  });

  it('serializes default custom colonies after opening the custom colonies list', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {
          ColoniesFilter: false,
        },
      },
    });
    const vm = wrapper.vm as any;

    await wrapper.setData({
      playersCount: 3,
      expansions: {...vm.expansions, colonies: true},
      showColoniesList: true,
    });
    await wrapper.vm.$nextTick();

    const serialized = await vm.serializeSettings();
    const payload = JSON.parse(serialized);

    expect(payload.customColoniesList.length).to.be.greaterThan(0);
    expect(payload.customColoniesList).to.include(ColonyName.CALLISTO);
  });

  it('loads rematch setup from cloneGameId without enabling predefined game', async () => {
    window.history.replaceState({}, '', '/new-game?cloneGameId=g456');
    global.fetch = (async (url: unknown) => {
      expect(String(url)).to.eq('api/cloneablegame?id=g456&setup=true');
      return {
        ok: true,
        json: async () => ({
          setup: {
            players: [
              {name: 'Alice', color: 'red', beginner: false, handicap: 0, first: true, isBot: false},
              {name: 'Bob', color: 'blue', beginner: false, handicap: 0, first: false, isBot: false},
            ],
            expansions: {
              corpera: true,
              promo: false,
              venus: true,
              colonies: false,
              prelude: true,
              prelude2: false,
              turmoil: false,
              community: false,
              ares: false,
              moon: false,
              pathfinders: false,
              ceo: false,
              starwars: false,
              underworld: false,
              deltaProject: false,
            },
            board: 'hellas',
            seededGame: false,
            clonedGamedId: undefined,
            randomFirstPlayer: false,
            draftVariant: true,
            showOtherPlayersVP: false,
            solarPhaseOption: false,
          },
        }),
      } as Response;
    }) as typeof fetch;

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    const vm = wrapper.vm as any;
    expect(vm.playersCount).to.eq(2);
    expect(vm.players[0].name).to.eq('Alice');
    expect(vm.seededGame).to.eq(false);
    expect(vm.clonedGameId).to.eq(undefined);
  });

  it('blocks invalid telegram ids during serialization', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.turnBasedGame = true;
    vm.players[0].telegramID = '@bad-id';

    let alertMessage = '';
    const originalAlert = window.alert;
    window.alert = ((message?: string) => {
      alertMessage = String(message ?? '');
    }) as typeof window.alert;

    try {
      const serialized = await vm.serializeSettings();
      expect(serialized).to.eq(undefined);
      expect(alertMessage).to.contain('invalid Telegram ID');
    } finally {
      window.alert = originalAlert;
    }
  });

  it('trims valid telegram ids before serialization', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.turnBasedGame = true;
    vm.players[0].telegramID = ' 123456789 ';

    const originalConfirm = window.confirm;
    window.confirm = (() => true) as typeof window.confirm;

    try {
      const serialized = await vm.serializeSettings();
      expect(serialized).to.be.a('string');
      const payload = JSON.parse(serialized);
      expect(payload.players[0].telegramID).to.eq('123456789');
    } finally {
      window.confirm = originalConfirm;
    }
  });

  it('blocks missing telegram ids during async game serialization', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.turnBasedGame = true;

    let alertMessage = '';
    const originalAlert = window.alert;
    window.alert = ((message?: string) => {
      alertMessage = String(message ?? '');
    }) as typeof window.alert;

    try {
      const serialized = await vm.serializeSettings();
      expect(serialized).to.eq(undefined);
      expect(alertMessage).to.contain('Telegram ID is required');
    } finally {
      window.alert = originalAlert;
    }
  });

  it('blocks typed names that match a saved player profile', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.players[0].name = 'Даша';

    let alertMessage = '';
    const originalAlert = window.alert;
    window.alert = ((message?: string) => {
      alertMessage = String(message ?? '');
    }) as typeof window.alert;

    try {
      const serialized = await vm.serializeSettings();
      expect(serialized).to.eq(undefined);
      expect(alertMessage).to.contain('saved profile');
      expect(alertMessage).to.contain('profile menu');
    } finally {
      window.alert = originalAlert;
    }
  });

  it('auto-fills hardcoded telegram ids for selected async player profiles', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.turnBasedGame = true;

    await wrapper.find('.create-game-player-name').trigger('focus');
    const profileOption = wrapper.findAll('.create-game-profile-option')
      .find((option) => option.text().includes('Даша'));
    expect(profileOption).not.to.be.undefined;
    await profileOption!.trigger('click');

    expect(vm.players[0].profileId).to.eq('dasha');
    expect(vm.players[0].telegramID).to.eq('432301679');
  });

  it('auto-fills locally remembered telegram ids for profiles without hardcoded ids', async () => {
    window.localStorage.setItem('tm_player_profile_telegram_ids', JSON.stringify({leha: '123456789'}));
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.turnBasedGame = true;

    await wrapper.find('.create-game-player-name').trigger('focus');
    const profileOption = wrapper.findAll('.create-game-profile-option')
      .find((option) => option.text().includes('Леха'));
    expect(profileOption).not.to.be.undefined;
    await profileOption!.trigger('click');

    expect(vm.players[0].profileId).to.eq('leha');
    expect(vm.players[0].telegramID).to.eq('123456789');
  });

  it('remembers manually entered telegram ids for selected profiles', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.find('.create-game-player-name').trigger('focus');
    const profileOption = wrapper.findAll('.create-game-profile-option')
      .find((option) => option.text().includes('Даша'));
    expect(profileOption).not.to.be.undefined;
    await profileOption!.trigger('click');

    vm.players[0].telegramID = ' 123456789 ';
    vm.normalizeAndRememberTelegramId(vm.players[0]);

    expect(vm.players[0].telegramID).to.eq('123456789');
    expect(JSON.parse(window.localStorage.getItem('tm_player_profile_telegram_ids') ?? '{}')).deep.eq({dasha: '123456789'});
  });

  it('requires confirmation before serializing async games with telegram recipients', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.playersCount = 2;
    vm.turnBasedGame = true;
    vm.players[0].telegramID = '123456789';
    vm.players[1].telegramID = '987654321';

    const confirmations: Array<string> = [];
    const originalConfirm = window.confirm;
    window.confirm = ((message?: string) => {
      confirmations.push(String(message ?? ''));
      return false;
    }) as typeof window.confirm;

    try {
      const serialized = await vm.serializeSettings();
      expect(serialized).to.eq(undefined);
      expect(confirmations).to.have.length(1);
      expect(confirmations[0]).to.contain('turn notifications');
      expect(confirmations[0]).to.contain('2 player(s)');
      expect(confirmations[0]).to.contain('matching player');
    } finally {
      window.confirm = originalConfirm;
    }
  });

  it('strips telegram ids when async mode is off', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.players[0].telegramID = '123456789';

    const serialized = await vm.serializeSettings();
    expect(serialized).to.be.a('string');
    const payload = JSON.parse(serialized);
    expect(payload.turnBasedGame).eq(false);
    expect(payload.players[0].telegramID).to.eq('');
  });

  it('serializes training games as no-ELO', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    await wrapper.setData({noEloGame: true});

    const serialized = await (wrapper.vm as unknown as {serializeSettings: () => Promise<string>}).serializeSettings();
    const payload = JSON.parse(serialized);

    expect(payload.noEloGame).eq(true);
  });

  it('serializes async turn-based games', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    await wrapper.setData({turnBasedGame: true});
    (wrapper.vm as any).players[0].telegramID = '123456789';

    const originalConfirm = window.confirm;
    window.confirm = (() => true) as typeof window.confirm;

    try {
      const serialized = await (wrapper.vm as unknown as {serializeSettings: () => Promise<string>}).serializeSettings();
      const payload = JSON.parse(serialized);

      expect(payload.turnBasedGame).eq(true);
    } finally {
      window.confirm = originalConfirm;
    }
  });

  it('serializes bot games only when the custom bot mode is enabled', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.players[0].isBot = true;

    const normalSerialized = await vm.serializeSettings();
    const normalPayload = JSON.parse(normalSerialized);
    expect(normalPayload.botGame).eq(false);
    expect(normalPayload.players[0].isBot).eq(false);

    await wrapper.setData({botGame: true});
    vm.players[0].isBot = true;
    const botSerialized = await vm.serializeSettings();
    const botPayload = JSON.parse(botSerialized);
    expect(botPayload.botGame).eq(true);
    expect(botPayload.players[0].isBot).eq(true);
  });

  it('auto manages World Government Terraforming by player count', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    expect(vm.solarPhaseOption).eq(true);
    expect(wrapper.find('#WGT-checkbox').attributes()).to.have.property('disabled');

    await wrapper.setData({playersCount: 4});
    expect(vm.solarPhaseOption).eq(false);

    vm.solarPhaseOption = true;
    const fourPlayerSerialized = await vm.serializeSettings();
    expect(JSON.parse(fourPlayerSerialized).solarPhaseOption).eq(false);

    await wrapper.setData({playersCount: 3});
    expect(vm.solarPhaseOption).eq(true);

    vm.solarPhaseOption = false;
    const threePlayerSerialized = await vm.serializeSettings();
    expect(JSON.parse(threePlayerSerialized).solarPhaseOption).eq(true);
  });

  it('syncs custom corp, prelude, and colony lists with expansion dependencies', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.setData({
      showCorporationList: true,
      showPreludesList: true,
      showColoniesList: true,
      expansions: {
        ...vm.expansions,
        colonies: true,
        prelude: true,
        venus: true,
        pathfinders: true,
        moon: false,
        turmoil: false,
      },
    });
    vm.syncCustomSelectionsWithExpansions();

    expect(vm.customCorporations).to.include(CardName.LAKEFRONT_RESORTS);
    expect(vm.customCorporations).to.include(CardName.UTOPIA_INVEST);
    expect(vm.customCorporations).not.to.include(CardName.MANUTECH);
    expect(vm.customCorporations).not.to.include(CardName.POINT_LUNA);
    expect(vm.customCorporations).not.to.include(CardName.VITOR);
    expect(vm.customPreludes).to.include(CardName.CREW_TRAINING);
    expect(vm.customColonies).to.include(ColonyName.CALLISTO);
    expect(vm.customColonies).to.include(ColonyName.IAPETUS_II);
    expect(vm.customColonies).not.to.include(ColonyName.PLUTO);

    await wrapper.setData({
      expansions: {
        ...vm.expansions,
        pathfinders: false,
      },
    });

    expect(vm.customPreludes).not.to.include(CardName.CREW_TRAINING);
    expect(vm.customColonies).not.to.include(ColonyName.IAPETUS_II);
    expect(vm.customCorporations).to.include(CardName.LAKEFRONT_RESORTS);
    expect(vm.customCorporations).to.include(CardName.UTOPIA_INVEST);
  });

  it('keeps custom corp and colony exclusions across expansion syncs', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.setData({
      showCorporationList: true,
      showColoniesList: true,
      expansions: {
        ...vm.expansions,
        colonies: true,
        prelude: true,
        venus: true,
        pathfinders: false,
      },
    });

    expect(vm.customCorporations).not.to.include(CardName.MANUTECH);
    expect(vm.customCorporations).not.to.include(CardName.POINT_LUNA);
    expect(vm.customCorporations).not.to.include(CardName.VITOR);
    expect(vm.customColonies).not.to.include(ColonyName.PLUTO);

    vm.updateCustomCorporations([...vm.customCorporations, CardName.MANUTECH]);
    vm.updateCustomColonies([...vm.customColonies, ColonyName.PLUTO]);
    vm.syncCustomSelectionsWithExpansions();

    expect(vm.customCorporations).to.include(CardName.MANUTECH);
    expect(vm.customColonies).to.include(ColonyName.PLUTO);

    vm.updateCustomCorporations(vm.customCorporations.filter((card: CardName) => card !== CardName.MANUTECH));
    vm.updateCustomColonies(vm.customColonies.filter((colony: ColonyName) => colony !== ColonyName.PLUTO));

    await wrapper.setData({
      expansions: {
        ...vm.expansions,
        pathfinders: true,
      },
    });
    vm.syncCustomSelectionsWithExpansions();

    expect(vm.customCorporations).not.to.include(CardName.MANUTECH);
    expect(vm.customColonies).not.to.include(ColonyName.PLUTO);
    expect(vm.customColonies).to.include(ColonyName.IAPETUS_II);
  });

  it('keeps explicitly selected fan colonies when reopening the custom colonies list', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.setData({
      showColoniesList: true,
      expansions: {
        ...vm.expansions,
        colonies: true,
        community: false,
        pathfinders: false,
      },
    });

    vm.updateCustomColonies([...vm.customColonies, ColonyName.IAPETUS, ColonyName.IAPETUS_II]);

    await wrapper.setData({showColoniesList: false});
    await wrapper.setData({showColoniesList: true});

    expect(vm.customColonies).to.include(ColonyName.IAPETUS);
    expect(vm.customColonies).to.include(ColonyName.IAPETUS_II);
  });

  it('restores explicitly selected fan colonies from saved settings', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    vm.applySettings({
      players: [
        {name: 'Alice', color: 'red', beginner: false, handicap: 0, first: false, isBot: false},
      ],
      expansions: {
        ...vm.expansions,
        colonies: true,
        community: false,
        pathfinders: false,
      },
      customColonies: [
        ColonyName.CALLISTO,
        ColonyName.CERES,
        ColonyName.ENCELADUS,
        ColonyName.IAPETUS,
        ColonyName.IAPETUS_II,
      ],
      customColonyExclusions: [],
      solarPhaseOption: true,
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(vm.customColonies).to.include(ColonyName.IAPETUS);
    expect(vm.customColonies).to.include(ColonyName.IAPETUS_II);
  });

  it('excludes Double Down by default when the Merger variant is enabled', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.setData({
      showPreludesList: true,
      expansions: {
        ...vm.expansions,
        prelude: true,
        promo: true,
      },
    });

    expect(vm.customPreludes).to.include(CardName.DOUBLE_DOWN);

    await wrapper.setData({twoCorpsVariant: true});

    expect(vm.customPreludes).not.to.include(CardName.DOUBLE_DOWN);

    vm.updateCustomPreludes([...vm.customPreludes, CardName.DOUBLE_DOWN]);
    vm.syncCustomSelectionsWithExpansions();

    expect(vm.customPreludes).to.include(CardName.DOUBLE_DOWN);
  });

  it('applies default custom bans when loading legacy selections without exclusion metadata', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.setData({
      showCorporationList: true,
      showColoniesList: true,
      showPreludesList: true,
      twoCorpsVariant: true,
      expansions: {
        ...vm.expansions,
        colonies: true,
        prelude: true,
        promo: true,
        venus: true,
      },
    });

    await wrapper.setData({
      customCorporations: vm.getSelectableCustomCorporations(),
      customColonies: vm.getSelectableCustomColonies(),
      customPreludes: vm.getSelectableCustomPreludes(),
    });

    vm.rememberCustomSelectionExclusions({
      preserveDefaultCorporationExclusions: true,
      preserveDefaultPreludeExclusions: true,
      preserveDefaultColonyExclusions: true,
    });
    vm.syncCustomSelectionsWithExpansions();

    expect(vm.customCorporations).not.to.include(CardName.MANUTECH);
    expect(vm.customCorporations).not.to.include(CardName.POINT_LUNA);
    expect(vm.customCorporations).not.to.include(CardName.VITOR);
    expect(vm.customPreludes).not.to.include(CardName.DOUBLE_DOWN);
    expect(vm.customColonies).not.to.include(ColonyName.PLUTO);
  });

  it('keeps typed player names from changing the selected colors', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    await wrapper.setData({
      playersCount: 4,
      randomFirstPlayer: false,
      players: [
        {name: 'North', color: 'blue', beginner: false, handicap: 0, first: false, isBot: false},
        {name: 'East', color: 'green', beginner: false, handicap: 0, first: false, isBot: false},
        {name: 'South', color: 'red', beginner: false, handicap: 0, first: false, isBot: false},
        {name: 'West', color: 'black', beginner: false, handicap: 0, first: false, isBot: false},
      ],
    });

    const serialized = await (wrapper.vm as unknown as {serializeSettings: () => Promise<string>}).serializeSettings();
    const payload = JSON.parse(serialized);

    expect(payload.players.map((player: {name: string, color: string}) => [player.name, player.color])).deep.eq([
      ['North', 'blue'],
      ['East', 'green'],
      ['South', 'red'],
      ['West', 'black'],
    ]);
  });

  it('keeps reserved persona color names editable', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.players[0].color = 'gold';
    vm.players[0].name = 'Ilya';
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.create-game-player-name').attributes()).not.to.have.property('readonly');

    const serialized = await vm.serializeSettings();
    expect(serialized).to.be.a('string');
    const payload = JSON.parse(serialized);
    expect(payload.players[0].name).to.eq('Ilya');
    expect(vm.players[0].name).to.eq('Ilya');
  });

  it('keeps reserved persona colors out of the standard color palette', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    const colors = wrapper.findAll('input[name="playerColor1"]')
      .map((radio) => (radio.element as HTMLInputElement).value);

    expect(colors).deep.eq([...DEFAULT_PLAYER_COLORS]);
  });

  it('applies player profiles without locking later name edits', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.find('.create-game-player-name').trigger('focus');
    const profileOption = wrapper.findAll('.create-game-profile-option')
      .find((option) => option.text().includes('Леха'));
    expect(profileOption).not.to.be.undefined;
    await profileOption!.trigger('click');

    expect(vm.players[0].color).to.eq('orange');
    expect(vm.players[0].name).to.eq('Леха');
    expect(vm.players[0].profileId).to.eq('leha');
    expect(wrapper.find('.create-game-player-name').attributes()).not.to.have.property('readonly');

    await wrapper.find('.create-game-player-name').setValue('Леха 2');

    const serialized = await vm.serializeSettings();
    expect(serialized).to.be.a('string');
    const payload = JSON.parse(serialized);
    expect(payload.players[0].name).to.eq('Леха 2');
    expect(vm.players[0].name).to.eq('Леха 2');
    expect(vm.players[0].profileId).to.eq(undefined);
  });

  it('hides profiles that are already selected in another player slot', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.setData({
      playersCount: 2,
      players: [
        {name: 'Леха', color: 'orange', beginner: false, handicap: 0, first: false, isBot: false, profileId: 'leha'},
        {name: '', color: 'green', beginner: false, handicap: 0, first: false, isBot: false},
      ],
    });

    const profileNames = vm.getAvailablePlayerProfiles(vm.players[1]).map((profile: {name: string}) => profile.name);

    expect(profileNames).not.to.include('Леха');
    expect(profileNames).to.include('Qiksa');
  });

  it('does not treat typed profile aliases as selected profiles', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.setData({
      playersCount: 2,
      players: [
        {name: 'Асмо', color: 'orange', beginner: false, handicap: 0, first: false, isBot: false},
        {name: '', color: 'green', beginner: false, handicap: 0, first: false, isBot: false},
      ],
    });

    const profileNames = vm.getAvailablePlayerProfiles(vm.players[1]).map((profile: {name: string}) => profile.name);

    expect(profileNames).to.include('Леха');
    expect(vm.getPlayerProfileNameError(vm.players[0])).to.contain('profile menu');
  });

  it('offers active Elo players as profiles', async () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      genuinegold: {displayName: 'GenuineGold', games: 48, elo: 1749},
      vladlen: {displayName: 'Владлен', games: 24, elo: 1691},
      alexey: {displayName: 'Алексей', games: 19, elo: 1269},
      inactive: {displayName: 'Inactive', games: 0, elo: 1600},
    };

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    const profileNames = vm.getAvailablePlayerProfiles(vm.players[0]).map((profile: {name: string}) => profile.name);

    expect(profileNames).to.include('GenuineGold');
    expect(profileNames).to.include('Владлен');
    expect(profileNames).to.include('Qiksa');
    expect(profileNames).not.to.include('Inactive');
  });

  it('applies observed favorite colors from player profiles', async () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      alexey: {displayName: 'Алексей', games: 19, elo: 1269},
      timur: {displayName: 'Тимур', games: 17, elo: 1506},
    };

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.find('.create-game-player-name').trigger('focus');
    const qiksaOption = wrapper.findAll('.create-game-profile-option')
      .find((option) => option.text().includes('Qiksa'));
    expect(qiksaOption).not.to.be.undefined;
    await qiksaOption!.trigger('click');

    expect(vm.players[0].name).to.eq('Qiksa');
    expect(vm.players[0].color).to.eq('black');

    vm.players[0].name = '';
    vm.players[0].color = 'green';
    await wrapper.find('.create-game-player-name').trigger('focus');
    const timurOption = wrapper.findAll('.create-game-profile-option')
      .find((option) => option.text().includes('Тимур'));
    expect(timurOption).not.to.be.undefined;
    await timurOption!.trigger('click');

    expect(vm.players[0].name).to.eq('Тимур');
    expect(vm.players[0].color).to.eq('red');
  });

  it('renders active Elo profiles with avatars, Elo, preferred colors, and player name typography', async () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      genuinegold: {displayName: 'GenuineGold', games: 48, elo: 1749},
      vladlen: {displayName: 'Владлен', games: 24, elo: 1691},
    };

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    await wrapper.find('.create-game-player-name').trigger('focus');
    const menuText = wrapper.find('.create-game-profile-menu').text();

    expect(menuText).to.include('GenuineGold');
    expect(menuText).to.include('ELO 1749');
    expect(menuText).to.include('48 games');
    expect(wrapper.find('.create-game-profile-option-colored .create-game-profile-avatar').text()).to.eq('GG');
    expect(wrapper.find('.create-game-profile-option-colored').classes()).to.include('player_translucent_bg_color_gold');
    expect(wrapper.find('.create-game-profile-option-colored .create-game-profile-option-name').classes()).to.include('player-name');
    expect(wrapper.find('.create-game-profile-color-swatch').exists()).to.be.true;
  });

  it('keeps the player profile menu anchored to the player name field', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const trigger = wrapper.find('.create-game-player-name');

    await trigger.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.create-game-profile-picker .create-game-profile-menu').exists()).to.eq(true);
    expect(wrapper.find('.create-game-profile-menu').attributes()).not.to.have.property('style');
  });

  it('keeps the player profile menu open when the viewport resizes', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const trigger = wrapper.find('.create-game-player-name');

    await trigger.trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.create-game-profile-menu').exists()).to.eq(true);

    window.dispatchEvent(new window.Event('resize'));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.create-game-profile-menu').exists()).to.eq(true);
  });

  it('opens the player profile menu from the player name field on touch devices', async () => {
    let focusCalls = 0;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('hover: none') || query.includes('pointer: coarse'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    window.HTMLInputElement.prototype.focus = function() {
      focusCalls++;
    };

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    await wrapper.find('.create-game-player-name').trigger('focus');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.create-game-profile-menu').exists()).to.eq(true);
    expect(focusCalls).to.eq(0);
  });

  it('filters player profile menu by player search text', async () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      genuinegold: {displayName: 'GenuineGold', games: 48, elo: 1749},
      nuke: {displayName: 'Nuke', games: 7, elo: 1497},
      vladlen: {displayName: 'Владлен', games: 24, elo: 1691},
    };

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.playerProfileSearch = 'nuk';

    const profileNames = vm.getFilteredAvailablePlayerProfiles(vm.players[0])
      .map((profile: {name: string}) => profile.name);

    expect(profileNames).deep.eq(['Nuke']);
  });

  it('uses the player profile menu input as an editable player name autocomplete', async () => {
    sharedEloState.loaded = true;
    sharedEloState.players = {
      genuinegold: {displayName: 'GenuineGold', games: 48, elo: 1749},
      nuke: {displayName: 'Nuke', games: 7, elo: 1497},
      vladlen: {displayName: 'Владлен', games: 24, elo: 1691},
    };

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    const nameInput = wrapper.find('.create-game-player-name');
    await nameInput.trigger('focus');
    await nameInput.setValue('Custom Nick');

    expect(vm.players[0].name).to.eq('Custom Nick');
    expect(vm.playerProfileSearch).to.eq('Custom Nick');
    expect(wrapper.find('.create-game-profile-menu').exists()).to.eq(true);
    expect(wrapper.find('.create-game-profile-option-custom').text()).to.contain('Custom nick');

    await nameInput.setValue('nuk');
    const profileNames = vm.getFilteredAvailablePlayerProfiles(vm.players[0])
      .map((profile: {name: string}) => profile.name);
    expect(profileNames).deep.eq(['Nuke']);

    await nameInput.trigger('keydown.enter');

    expect(vm.players[0].name).to.eq('Nuke');
    expect(vm.players[0].color).to.eq('black');
    expect(wrapper.find('.create-game-profile-menu').exists()).to.eq(false);
  });

  it('uses the player name field as the profile picker and offers custom nick', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    expect(wrapper.find('.create-game-player-profile-trigger').exists()).to.eq(false);
    expect(wrapper.find('.create-game-player-name').exists()).to.eq(true);
    expect(wrapper.find('.create-game-persona-select').exists()).to.eq(false);
    expect(wrapper.find('.create-game-persona-preview').exists()).to.eq(false);

    await wrapper.find('.create-game-player-name').trigger('focus');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.create-game-profile-menu').text()).to.contain('Custom nick');
  });

  it('preserves typed names for reserved persona colors', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    for (const testCase of [
      {color: 'emerald', inputName: 'Rav'},
      {color: 'ginger', inputName: 'Katerina'},
      {color: 'pearl', inputName: 'Pearl Custom'},
      {color: 'hydro', inputName: 'Sonya'},
      {color: 'antistress', inputName: 'Anatoly'},
      {color: 'gambit', inputName: 'Olesya'},
      {color: 'turquoise', inputName: 'Pavel'},
      {color: 'saturn', inputName: 'Sonya'},
      {color: 'saturnrings', inputName: 'Sonya'},
      {color: 'titan', inputName: 'Sonya'},
      {color: 'saturnstorm', inputName: 'Sonya'},
      {color: 'catseye', inputName: 'Sonya'},
    ]) {
      vm.players[0].color = testCase.color;
      vm.players[0].name = testCase.inputName;

      const serialized = await vm.serializeSettings();
      expect(serialized).to.be.a('string');
      const payload = JSON.parse(serialized);
      expect(payload.players[0].name).to.eq(testCase.inputName);
      expect(vm.players[0].name).to.eq(testCase.inputName);
    }
  });
});
