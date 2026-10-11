import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import Sidebar from '@/client/components/Sidebar.vue';
import {fakeGameOptionsModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import GlobalParameterValue from '@/client/components/GlobalParameterValue.vue';
import {DEFAULT_GLOBAL_PARAMETERS} from '@/common/GlobalParameterConfig';

describe('Sidebar', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
  });

  it('uses the game track limits for completion indicators', async () => {
    const gameOptions = fakeGameOptionsModel();
    gameOptions.expansions.venus = true;
    gameOptions.expansions.venusPhase2 = true;
    gameOptions.globalParameters = {
      ...DEFAULT_GLOBAL_PARAMETERS,
      oxygen: {...DEFAULT_GLOBAL_PARAMETERS.oxygen, max: 18},
      venus: {...DEFAULT_GLOBAL_PARAMETERS.venus, max: 40},
    };
    const wrapper = shallowMount(Sidebar, {
      ...globalConfig,
      global: {...globalConfig.global, stubs: {GlobalParameterValue: false}},
      props: {
        playerNumber: 2,
        gameOptions,
        actingPlayer: true,
        playerColor: 'blue',
        generation: 1,
        coloniesCount: 0,
        temperature: -30,
        oxygen: 14,
        oceans: 0,
        venus: 30,
        moonData: {habitatRate: 0, miningRate: 0, logisticRate: 0, spaces: []},
        turmoil: undefined,
        lastSoloGeneration: 14,
        deckSize: 100,
        discardPileSize: 0,
        otherDeckSizes: {corporations: {drawPile: 0, discardPile: 0}, preludes: undefined, ceos: undefined, globalEvents: undefined},
      },
    });
    expect(wrapper.exists()).to.be.true;
    const indicators = wrapper.findAllComponents(GlobalParameterValue);
    const oxygen = indicators[1];
    const venus = indicators[3];
    expect(oxygen.text()).eq('14%');
    expect(venus.text()).eq('30%');
    expect(venus.find('.checkmark').exists()).eq(false);
    await wrapper.setProps({oxygen: 18, venus: 60});
    expect(oxygen.find('.checkmark').exists()).eq(true);
    expect(venus.find('.checkmark').exists()).eq(true);
    await wrapper.setProps({gameOptions: {...gameOptions, expansions: {...gameOptions.expansions, venusPhase2: false}}, venus: 40});
    expect(venus.find('.checkmark').exists()).eq(true);
    await wrapper.setProps({gameOptions: {...gameOptions, expansions: {...gameOptions.expansions, venusPhase2: false}, globalParameters: undefined}, venus: 30});
    expect(venus.find('.checkmark').exists()).eq(true);
    wrapper.unmount();
  });
});
