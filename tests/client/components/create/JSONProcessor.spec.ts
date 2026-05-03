import {expect} from 'chai';
import {JSONProcessor} from '@/client/components/create/JSONProcessor';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {RandomMAOptionType} from '@/common/ma/RandomMAOptionType';
import {BoardName} from '@/common/boards/BoardName';
import {JSONObject} from '@/common/Types';
import {CreateGameModel} from '@/client/components/create/CreateGameModel';
import {CardName} from '@/common/cards/CardName';
import {ANTISTRESS_NAME, CATHARSIS_NAME, EMERALD_RAV_NAME, GAMBIT_GIRL_NAME, GENUINE_GOLD_NAME, GYDRO_NAME, PAVEL_TURQUOISE_NAME, TOMA_NAME} from '@/common/Color';

type Case = {
  description: string,
  input: JSONObject,
  expected: CreateGameModel,
  expectedWarnings?: Array<string>,
}

const TEMPLATE_INPUT = {
  players: [
    {
      name: 'You',
      color: 'red',
      beginner: false,
      handicap: 0,
      first: false,
    },
  ],
  expansions: {
    corpera: true,
    promo: false,
    venus: false,
    colonies: false,
    prelude: false,
    prelude2: false,
    turmoil: false,
    community: false,
    ares: false,
    moon: false,
    pathfinders: false,
    ceo: false,
    starwars: false,
    underworld: false,
  },
  draftVariant: true,
  showOtherPlayersVP: false,
  customCorporationsList: [],
  customColoniesList: [],
  customPreludes: [],
  bannedCards: [],
  includedCards: [],
  board: 'tharsis',
  seed: 0.40189423667985547,
  solarPhaseOption: false,
  aresExtremeVariant: false,
  politicalAgendasExtension: 'Standard',
  undoOption: false,
  showTimers: true,
  fastModeOption: false,
  removeNegativeGlobalEventsOption: false,
  includeFanMA: false,
  modularMA: false,
  startingCorporations: 2,
  soloTR: false,
  initialDraft: false,
  preludeDraftVariant: false,
  ceosDraftVariant: false,
  randomMA: 'No randomization',
  shuffleMapOption: false,
  randomFirstPlayer: true,
  requiresVenusTrackCompletion: false,
  requiresMoonTrackCompletion: false,
  moonStandardProjectVariant: false,
  moonStandardProjectVariant1: false,
  altVenusBoard: false,
  escapeVelocityMode: false,
  escapeVelocityBonusSeconds: 2,
  twoCorpsVariant: false,
  customCeos: [],
  startingCeos: 3,
  startingPreludes: 4,
};

const TEMPLATE_EXPECTED: CreateGameModel = {
  firstIndex: 1,
  playersCount: 1,
  players: [
    {name: 'You', color: 'red', beginner: false, handicap: 0, first: false, isBot: false},
    {name: '', color: 'green', beginner: false, handicap: 0, first: false, isBot: false, telegramID: ''},
    {name: '', color: 'yellow', beginner: false, handicap: 0, first: false, isBot: false, telegramID: ''},
    {name: '', color: 'blue', beginner: false, handicap: 0, first: false, isBot: false, telegramID: ''},
    {name: '', color: 'black', beginner: false, handicap: 0, first: false, isBot: false, telegramID: ''},
    {name: '', color: 'purple', beginner: false, handicap: 0, first: false, isBot: false, telegramID: ''},
    {name: '', color: 'orange', beginner: false, handicap: 0, first: false, isBot: false, telegramID: ''},
    {name: '', color: 'pink', beginner: false, handicap: 0, first: false, isBot: false, telegramID: ''},
  ],
  expansions: {
    corpera: true,
    promo: false,
    venus: false,
    colonies: false,
    prelude: false,
    prelude2: false,
    turmoil: false,
    community: false,
    ares: false,
    moon: false,
    pathfinders: false,
    ceo: false,
    starwars: false,
    underworld: false,
  },
  draftVariant: true,
  initialDraft: false,
  randomMA: 'No randomization' as RandomMAOptionType,
  modularMA: false,
  randomFirstPlayer: true,
  showOtherPlayersVP: false,
  showColoniesList: false,
  showCorporationList: false,
  showPreludesList: false,
  showBannedCards: false,
  showCeosList: false,
  clonedGameId: undefined,
  showIncludedCards: false,
  customColonies: [],
  customCorporations: [],
  customPreludes: [],
  bannedCards: [],
  includedCards: [],
  board: 'tharsis' as BoardName,
  seed: 0.40189423667985547,
  seededGame: false,
  solarPhaseOption: false,
  shuffleMapOption: false,
  aresExtremeVariant: false,
  politicalAgendasExtension: 'Standard',
  undoOption: false,
  showTimers: true,
  fastModeOption: false,
  removeNegativeGlobalEventsOption: false,
  includeFanMA: false,
  startingCorporations: 2,
  soloTR: false,
  allOfficialExpansions: false,
  requiresVenusTrackCompletion: false,
  requiresMoonTrackCompletion: false,
  moonStandardProjectVariant: false,
  moonStandardProjectVariant1: false,
  altVenusBoard: false,
  escapeVelocityMode: false,
  escapeVelocityThreshold: 30,
  escapeVelocityBonusSeconds: 2,
  escapeVelocityPeriod: 2,
  escapeVelocityPenalty: 1,
  twoCorpsVariant: false,
  customCeos: [],
  startingCeos: 3,
  startingPreludes: 4,
  preludeDraftVariant: false,
  ceosDraftVariant: false,
};

const cases: Array<Case> = [
  {
    description: 'sanity',
    input: TEMPLATE_INPUT,
    expected: TEMPLATE_EXPECTED,
  },
  {
    description: 'outdated custom corporation list',
    input: {
      ...TEMPLATE_INPUT,
      customCorporationsList: [CardName.ECOLINE],
    }, expected: {
      ...TEMPLATE_EXPECTED,
      customCorporations: [CardName.ECOLINE],
    },
  },
  {
    description: 'new escape velocity values',
    input: {
      ...TEMPLATE_INPUT,
      escapeVelocity: {
        thresholdMinutes: '35',
        bonusSectionsPerAction: 2,
        penaltyPeriodMinutes: 2,
        penaltyVPPerPeriod: 1,
      },
    },
    expected: {
      ...TEMPLATE_EXPECTED,
      escapeVelocityBonusSeconds: 2,
      escapeVelocityMode: true,
      escapeVelocityPenalty: 1,
      escapeVelocityPeriod: 2,
      escapeVelocityThreshold: 35,
    },
  },
];


describe('JSONProcessor', () => {
  for (const testCase of cases) {
    it(testCase.description, () => {
      const model = defaultCreateGameModel();
      const processor = new JSONProcessor(model);
      processor.applyJSON(testCase.input);

      expect(processor.warnings).deep.eq(testCase.expectedWarnings ?? []);
      expect(model).deep.eq(testCase.expected);
    });
  }

  it('forces GenuineGold for gold players from JSON', () => {
    const model = defaultCreateGameModel();
    const processor = new JSONProcessor(model);
    processor.applyJSON({
      ...TEMPLATE_INPUT,
      players: [{
        name: 'Ilya',
        color: 'gold',
        beginner: false,
        handicap: 0,
        first: false,
      }],
    });

    expect(model.playersCount).to.eq(1);
    expect(model.players[0].color).to.eq('gold');
    expect(model.players[0].name).to.eq(GENUINE_GOLD_NAME);
  });

  it('forces reserved persona names from JSON', () => {
    for (const testCase of [
      {color: 'emerald', inputName: 'Rav', expectedName: EMERALD_RAV_NAME},
      {color: 'ginger', inputName: 'Catharsis', expectedName: CATHARSIS_NAME},
      {color: 'hydro', inputName: 'Ruslan', expectedName: GYDRO_NAME},
      {color: 'antistress', inputName: 'Anatoly', expectedName: ANTISTRESS_NAME},
      {color: 'gambit', inputName: 'Olesya', expectedName: GAMBIT_GIRL_NAME},
      {color: 'turquoise', inputName: 'Pavel', expectedName: PAVEL_TURQUOISE_NAME},
      {color: 'saturn', inputName: 'Sonya', expectedName: TOMA_NAME},
      {color: 'saturnrings', inputName: 'Sonya', expectedName: TOMA_NAME},
      {color: 'titan', inputName: 'Sonya', expectedName: TOMA_NAME},
      {color: 'saturnstorm', inputName: 'Sonya', expectedName: TOMA_NAME},
      {color: 'catseye', inputName: 'Sonya', expectedName: TOMA_NAME},
    ]) {
      const model = defaultCreateGameModel();
      const processor = new JSONProcessor(model);
      processor.applyJSON({
        ...TEMPLATE_INPUT,
        players: [{
          name: testCase.inputName,
          color: testCase.color,
          beginner: false,
          handicap: 0,
          first: false,
        }],
      });

      expect(model.playersCount).to.eq(1);
      expect(model.players[0].color).to.eq(testCase.color);
      expect(model.players[0].name).to.eq(testCase.expectedName);
    }
  });
});
