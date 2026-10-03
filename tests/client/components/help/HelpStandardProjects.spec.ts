import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import HelpStandardProjects from '@/client/components/help/HelpStandardProjects.vue';
import {CardName} from '@/common/cards/CardName';

describe('HelpStandardProjects', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(HelpStandardProjects, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('lists Venus: Phase 2 and Industries standard projects among the fan-made ones', () => {
    const wrapper = shallowMount(HelpStandardProjects, {
      ...globalConfig,
    });
    const vm = wrapper.vm as any;
    const fanMade: Array<CardName> = vm.getFanMadeStandardProjects();

    for (const cardName of [
      CardName.CLOUD_CITY_STANDARD_PROJECT,
      CardName.GAS_MINE_STANDARD_PROJECT,
      CardName.FLOATER_ARRAY_STANDARD_PROJECT,
      CardName.HEAT_INDUSTRY_STANDARD_PROJECT,
      CardName.MONEY_INDUSTRY_STANDARD_PROJECT,
      CardName.ENERGY_INDUSTRY_STANDARD_PROJECT,
      CardName.STEEL_INDUSTRY_STANDARD_PROJECT,
      CardName.PLANT_INDUSTRY_STANDARD_PROJECT,
      CardName.TITANIUM_INDUSTRY_STANDARD_PROJECT,
      CardName.WILD_INDUSTRY_STANDARD_PROJECT,
    ]) {
      expect(fanMade, cardName).to.include(cardName);
    }
  });
});
