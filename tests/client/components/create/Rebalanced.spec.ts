import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import {fakeGameOptionsModel} from '../testHelpers';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';
import PreludesFilter from '@/client/components/create/PreludesFilter.vue';
import CorporationsFilter from '@/client/components/create/CorporationsFilter.vue';
import GameSetupDetail from '@/client/components/GameSetupDetail.vue';
import HelpRulebooks from '@/client/components/help/HelpRulebooks.vue';
import {TemplateManager} from '@/client/components/create/TemplateManager';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {CreateGameModel} from '@/client/components/create/CreateGameModel';
import {getCard, getCardReplacementRules} from '@/client/cards/ClientCardManifest';
import {filterReplacedCards} from '@/common/cards/CardReplacementRules';
import {CardName} from '@/common/cards/CardName';
import {DEFAULT_EXPANSIONS} from '@/common/cards/GameModule';
import {NewGameConfig} from '@/common/game/NewGameConfig';

const rulesUrl = 'https://github.com/rusliksu/terraforming-mars/blob/main/docs/variants/rebalanced.md';
const preludeFamily = [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_BETTER_MARS,
  CardName.EARLY_SETTLEMENT_REBALANCED, CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS];
const corporationFamily = [CardName.PRISTAR, CardName.PRISTAR_BETTER_MARS,
  CardName.PRISTAR_REBALANCED, CardName.PRISTAR_REBALANCED_BETTER_MARS];

describe('Rebalanced setup', () => {
  beforeEach(() => {
    global.localStorage = window.localStorage;
    localStorage.clear();
  });
  afterEach(() => localStorage.clear());

  it('offers an unchecked Rebalanced option and its public rules', () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    const checkbox = wrapper.get<HTMLInputElement>('#rebalanced-checkbox');
    expect(checkbox.element.checked).is.false;
    expect(wrapper.vm.expansions.rebalanced).is.false;
    const label = wrapper.get('label[for="rebalanced-checkbox"]');
    expect(label.text()).includes('Rebalanced');
    expect(label.find('.expansion-icon-rebalanced').exists()).is.true;
    expect(label.get('a').attributes('href')).eq(rulesUrl);
  });

  it('updates the chosen preludes when the checkbox is switched on and off', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    wrapper.vm.expansions.prelude = true;
    wrapper.vm.showPreludesList = true;
    await wrapper.vm.$nextTick();
    const filter = wrapper.getComponent(PreludesFilter);
    expect(filter.props('selected')).includes(CardName.EARLY_SETTLEMENT);

    await wrapper.get('#rebalanced-checkbox').setValue(true);
    expect(filter.props('selectable')).includes(CardName.EARLY_SETTLEMENT_REBALANCED);
    expect(filter.props('selected')).includes(CardName.EARLY_SETTLEMENT_REBALANCED).and.not.includes(CardName.EARLY_SETTLEMENT);
    await wrapper.get('#rebalanced-checkbox').setValue(false);
    expect(filter.props('selected')).includes(CardName.EARLY_SETTLEMENT).and.not.includes(CardName.EARLY_SETTLEMENT_REBALANCED);
  });

  for (const [rebalanced, betterMars, expected] of [
    [false, false, 0], [false, true, 1], [true, false, 2], [true, true, 3],
  ] as const) {
    it('normalizes an old manual list in module mode ' + rebalanced + '/' + betterMars, async () => {
      const wrapper = shallowMount(CreateGameForm, globalConfig);
      const settings = TemplateManager.serializeFormState(defaultCreateGameModel());
      settings.expansions = {...DEFAULT_EXPANSIONS, prelude: true, turmoil: true,
        pathfinders: true, rebalanced, betterMars};
      settings.customPreludes = preludeFamily;
      settings.customCorporationsList = corporationFamily;
      wrapper.vm.showPreludesList = true;
      wrapper.vm.showCorporationList = true;
      wrapper.vm.applySettings(settings);
      await wrapper.vm.$nextTick();
      const selectedPreludes: Array<CardName> = wrapper.getComponent(PreludesFilter).props('selected');
      const selectedCorporations: Array<CardName> = wrapper.getComponent(CorporationsFilter).props('selected');
      expect(selectedPreludes.filter((name) => preludeFamily.includes(name))).deep.eq([preludeFamily[expected]]);
      expect(selectedCorporations.filter((name) => corporationFamily.includes(name))).deep.eq([corporationFamily[expected]]);
    });
  }

  it('uses the exported client chain for an original and combined card without intermediates', () => {
    const original = getCard(CardName.EARLY_SETTLEMENT);
    const combined = getCard(CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS);
    if (original === undefined || combined === undefined) {
      throw new Error('Missing registered client card');
    }
    const enabled = new Set(['base', 'prelude', 'pathfinders', 'rebalanced', 'betterMars']);
    const filtered = filterReplacedCards([original, combined], getCardReplacementRules((module) => enabled.has(module)));
    expect(filtered.map((card) => card.name)).deep.eq([CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS]);
  });

  it('serializes Prelude 2 with Rebalanced and restores both through saved settings', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    await wrapper.get('#prelude2-checkbox').setValue(true);
    await wrapper.get('#rebalanced-checkbox').setValue(true);
    wrapper.vm.showPreludesList = true;
    await wrapper.vm.$nextTick();
    const selected = wrapper.getComponent(PreludesFilter).props('selectable');
    expect(selected).includes(CardName.APPLIED_SCIENCE).and.includes(CardName.EARLY_SETTLEMENT_REBALANCED);
    const serialized = await wrapper.vm.serializeSettings();
    if (serialized === undefined) {
      throw new Error('Valid setup was not serialized');
    }
    const request: NewGameConfig = JSON.parse(serialized);
    expect(request.expansions.rebalanced).is.true;
    expect(request.expansions.prelude2).is.true;

    const saved = TemplateManager.serializeFormState(wrapper.vm.$data as CreateGameModel);
    wrapper.vm.resetSettings();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.expansions.rebalanced).is.false;
    wrapper.vm.applySettings(saved);
    await wrapper.vm.$nextTick();
    expect(wrapper.get<HTMLInputElement>('#rebalanced-checkbox').element.checked).is.true;
    expect(wrapper.vm.expansions.prelude2).is.true;
  });

  it('keeps a template without the new field on the original rules', async () => {
    const wrapper = shallowMount(CreateGameForm, globalConfig);
    wrapper.vm.expansions.rebalanced = true;
    const settings = TemplateManager.serializeFormState(defaultCreateGameModel());
    const {rebalanced: _absent, ...legacyExpansions} = DEFAULT_EXPANSIONS;
    settings.expansions = {...legacyExpansions, prelude: true};
    wrapper.vm.applySettings(settings);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.expansions.rebalanced).is.false;
    expect(wrapper.vm.getSelectableCustomPreludes()).includes(CardName.EARLY_SETTLEMENT).and.not.includes(CardName.EARLY_SETTLEMENT_REBALANCED);
  });

  it('links the enabled setup icon and help entry to the same public rules', async () => {
    const options = fakeGameOptionsModel();
    const setup = shallowMount(GameSetupDetail, {...globalConfig,
      props: {gameOptions: options, playerNumber: 2, lastSoloGeneration: 14}});
    expect(setup.find('.expansion-icon-rebalanced').exists()).is.false;
    options.expansions.rebalanced = true;
    await setup.setProps({gameOptions: {...options}});
    expect(setup.get('a[data-tooltip="Rebalanced rules"]').attributes('href')).eq(rulesUrl);
    const help = shallowMount(HelpRulebooks, globalConfig);
    const entry = help.findAll('a').find((row) => row.text() === 'Rebalanced');
    expect(entry?.attributes('href')).eq(rulesUrl);
    expect(entry?.find('.expansion-icon-rebalanced').exists()).is.true;
  });
});
