import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import HelpIconology from '@/client/components/help/HelpIconology.vue';

describe('HelpIconology', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(HelpIconology, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('lists the remaining fan expansion tags (Crime, Infrastructure, Galactic)', () => {
    const wrapper = shallowMount(HelpIconology, {
      ...globalConfig,
    });
    for (const tagClass of ['tag-crime', 'tag-infrastructure', 'tag-galactic']) {
      expect(wrapper.find(`.${tagClass}`).exists(), tagClass).to.be.true;
    }
  });

  it('lists the fan expansion card resources', () => {
    const wrapper = shallowMount(HelpIconology, {
      ...globalConfig,
    });
    for (const resourceClass of [
      'card-resource-cube', 'card-resource-data', 'card-resource-syndicate-fleet',
      'card-resource-venusian-habitat', 'card-resource-specialized-robot', 'card-resource-seed',
      'card-resource-agenda', 'card-resource-orbital', 'card-resource-clone-trooper',
      'card-resource-tool', 'card-resource-ware', 'card-resource-journalism',
      'card-resource-activist', 'card-resource-supply-chain', 'card-resource-loot',
      'card-resource-budget', 'card-resource-relic', 'card-resource-ore',
    ]) {
      expect(wrapper.find(`.${resourceClass}`).exists(), resourceClass).to.be.true;
    }
  });

  it('lists Corruption and Coordination as fan resources that are not stored on cards', () => {
    const wrapper = shallowMount(HelpIconology, {
      ...globalConfig,
    });
    expect(wrapper.text()).to.contain('Not on Cards');
    expect(wrapper.find('.tag-corruption-count').exists()).to.be.true;
    expect(wrapper.find('.resource_icon--coordination').exists()).to.be.true;
  });

  it('has a Fan Tiles section with lunar and Venus: Phase 2 tiles', () => {
    const wrapper = shallowMount(HelpIconology, {
      ...globalConfig,
    });
    expect(wrapper.text()).to.contain('Fan Tiles');
    for (const tileClass of [
      'card-tile-lunar-mine', 'card-tile-lunar-habitat', 'card-tile-lunar-road',
      'venus-cloud-city-tile', 'venus-gas-mine-tile', 'venus-floater-array-tile',
    ]) {
      expect(wrapper.find(`.${tileClass}`).exists(), tileClass).to.be.true;
    }
  });
});
