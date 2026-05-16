import {shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';
import {
  ANTISTRESS_NAME,
  CATHARSIS_NAME,
  DEFAULT_PLAYER_COLORS,
  EMERALD_RAV_NAME,
  GAMBIT_GIRL_NAME,
  GENUINE_GOLD_NAME,
  GYDRO_NAME,
  PAVEL_TURQUOISE_NAME,
  TOMA_NAME,
} from '@/common/Color';

describe('CreateGameForm', () => {
  let originalFetch: typeof fetch;
  let originalUrl: string;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalUrl = window.location.href;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.replaceState({}, '', originalUrl);
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
    expect(wrapper.text()).to.contain('Custom settings');
    expect(wrapper.text()).not.to.contain('/start');
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

    const serialized = await vm.serializeSettings();
    expect(serialized).to.be.a('string');
    const payload = JSON.parse(serialized);
    expect(payload.players[0].telegramID).to.eq('123456789');
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

    const serialized = await (wrapper.vm as unknown as {serializeSettings: () => Promise<string>}).serializeSettings();
    const payload = JSON.parse(serialized);

    expect(payload.turnBasedGame).eq(true);
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

  it('keeps typed player names from changing the selected colors', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    await wrapper.setData({
      playersCount: 4,
      randomFirstPlayer: false,
      players: [
        {name: 'GydRo', color: 'blue', beginner: false, handicap: 0, first: false, isBot: false},
        {name: 'Олеся', color: 'green', beginner: false, handicap: 0, first: false, isBot: false},
        {name: 'Паша', color: 'red', beginner: false, handicap: 0, first: false, isBot: false},
        {name: 'Тома', color: 'black', beginner: false, handicap: 0, first: false, isBot: false},
      ],
    });

    const serialized = await (wrapper.vm as unknown as {serializeSettings: () => Promise<string>}).serializeSettings();
    const payload = JSON.parse(serialized);

    expect(payload.players.map((player: {name: string, color: string}) => [player.name, player.color])).deep.eq([
      ['GydRo', 'blue'],
      ['Олеся', 'green'],
      ['Паша', 'red'],
      ['Тома', 'black'],
    ]);
  });

  it('locks the gold player name to GenuineGold', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.players[0].color = 'gold';
    vm.players[0].name = 'Ilya';
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.create-game-player-name').attributes()).to.have.property('readonly');

    const serialized = await vm.serializeSettings();
    expect(serialized).to.be.a('string');
    const payload = JSON.parse(serialized);
    expect(payload.players[0].name).to.eq(GENUINE_GOLD_NAME);
    expect(vm.players[0].name).to.eq(GENUINE_GOLD_NAME);
  });

  it('keeps reserved persona colors out of the standard color palette', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    const colors = wrapper.findAll('input[name="playerColor1"]')
      .map((radio) => (radio.element as HTMLInputElement).value);

    expect(colors).deep.eq([...DEFAULT_PLAYER_COLORS]);
  });

  it('applies reserved personas from the compact nick selector', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    await wrapper.find('.create-game-persona-select').setValue('emerald');

    expect(vm.players[0].color).to.eq('emerald');
    expect(vm.players[0].name).to.eq(EMERALD_RAV_NAME);
  });

  it('shows final Toma option and hides rejected Toma variants from the compact nick selector', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    const options = wrapper.find('.create-game-persona-select')
      .findAll('option')
      .map((option) => option.text());

    expect(options).to.include(`${TOMA_NAME} · мрачный тёмно-фиолетовый`);
    expect(options).not.to.include('Тома · Старый красно-розовый');
    expect(options).not.to.include('Тома · Сатурн');
    expect(options).not.to.include('Тома · Кольца Сатурна');
    expect(options).not.to.include('Тома · Титан');
    expect(options).not.to.include('Тома · Кошачий глаз');
  });

  it('filters out reserved personas already selected by another player', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    vm.playersCount = 2;
    await wrapper.vm.$nextTick();

    const selects = wrapper.findAll('.create-game-persona-select');
    await selects[0].setValue('gold');
    await wrapper.vm.$nextTick();

    const secondOptions = selects[1]
      .findAll('option')
      .map((option) => option.text());

    expect(secondOptions).not.to.include(`${GENUINE_GOLD_NAME} · золото`);
    expect(secondOptions).to.include(`${EMERALD_RAV_NAME} · изумруд`);
    expect(secondOptions).to.include(`${CATHARSIS_NAME} · рыжий`);
    expect(secondOptions).to.include(`${GYDRO_NAME} · перламутр`);
    expect(secondOptions).to.include(`${ANTISTRESS_NAME} · тёмно-синий`);
    expect(secondOptions).to.include(`${GAMBIT_GIRL_NAME} · гортензия`);
    expect(secondOptions).to.include(`${PAVEL_TURQUOISE_NAME} · коралл`);
  });

  it('renders persona preview using the shared colorbox swatch', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    const preview = wrapper.find('.create-game-persona-preview .create-game-colorbox');
    expect(preview.exists()).to.eq(true);
    expect(preview.classes()).to.include('player_bg_color_red');
  });

  it('locks reserved persona names', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;

    for (const testCase of [
      {color: 'emerald', inputName: 'Rav', expectedName: EMERALD_RAV_NAME},
      {color: 'ginger', inputName: 'Katerina', expectedName: CATHARSIS_NAME},
      {color: 'pearl', inputName: 'Ruslan', expectedName: GYDRO_NAME},
      {color: 'hydro', inputName: 'Sonya', expectedName: TOMA_NAME},
      {color: 'antistress', inputName: 'Anatoly', expectedName: ANTISTRESS_NAME},
      {color: 'gambit', inputName: 'Olesya', expectedName: GAMBIT_GIRL_NAME},
      {color: 'turquoise', inputName: 'Pavel', expectedName: PAVEL_TURQUOISE_NAME},
      {color: 'saturn', inputName: 'Sonya', expectedName: TOMA_NAME},
      {color: 'saturnrings', inputName: 'Sonya', expectedName: TOMA_NAME},
      {color: 'titan', inputName: 'Sonya', expectedName: TOMA_NAME},
      {color: 'saturnstorm', inputName: 'Sonya', expectedName: TOMA_NAME},
      {color: 'catseye', inputName: 'Sonya', expectedName: TOMA_NAME},
    ]) {
      vm.players[0].color = testCase.color;
      vm.players[0].name = testCase.inputName;

      const serialized = await vm.serializeSettings();
      expect(serialized).to.be.a('string');
      const payload = JSON.parse(serialized);
      expect(payload.players[0].name).to.eq(testCase.expectedName);
      expect(vm.players[0].name).to.eq(testCase.expectedName);
    }
  });
});
