import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import PlayerResources from '@/client/wrybit/visuals/overview/PlayerResources.vue';
import PlayerResource from '@/client/wrybit/visuals/overview/PlayerResource.vue';
import {CardName} from '@/common/cards/CardName';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePublicPlayerModel} from '@tests/client/components/testHelpers';

describe('Wrybit resources with our player data', () => {
  let storage: FakeLocalStorage;
  beforeEach(() => {
    storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
  });
  afterEach(() => {
    PreferencesManager.resetForTest();
    FakeLocalStorage.deregister(storage);
  });

  it('preserves our Coordination, team, material and heat information across player refreshes', async () => {
    const player = fakePublicPlayerModel({
      megacredits: 23, megacreditProduction: -2, steel: 3, steelValue: 4,
      heat: 8, heatProduction: 2, tableau: [{name: CardName.HELION}],
      protectedResources: {steel: 'half'}, protectedProduction: {heat: 'on'},
      conglomeratesTeamColor: 'red', conglomeratesData: {coordination: 5},
    });
    const wrapper = mount(PlayerResources, {...globalConfig, props: {player, conglomeratesExpansion: true}});
    try {
      expect(wrapper.findAllComponents(PlayerResource)).has.length(6);
      expect(wrapper.classes()).contains('resource_items_cont--team_red');
      expect(wrapper.get('.resource_item--megacredits [data-test="stock-count"]').text()).eq('23');
      expect(wrapper.get('.resource_item--megacredits [data-test="production"]').text()).eq('-2');
      expect(wrapper.get('.resource_item--steel [data-test="resource-value"]').text()).eq('4');
      expect(wrapper.find('.resource_item--steel .shield_icon_half').exists()).is.true;
      expect(wrapper.get('.resource_item--heat [data-test="resource-value"]').text()).eq('1');
      expect(wrapper.find('.resource_item--heat .shield_production_protection').exists()).is.true;
      expect(wrapper.get('[data-test="coordination-resource"] [data-test="stock-count"]').text()).eq('5');
      expect(wrapper.get('[data-test="coordination-resource"] [data-test="production"]').text()).eq('+2');
      expect(wrapper.find('.resource_icon--coordination-fill').exists()).is.true;
      await wrapper.setProps({player: fakePublicPlayerModel({megacredits: 9}), conglomeratesExpansion: false});
      expect(wrapper.get('.resource_item--megacredits [data-test="stock-count"]').text()).eq('9');
      expect(wrapper.find('[data-test="coordination-resource"]').exists()).is.false;
      expect(wrapper.find('.resource_item--heat [data-test="resource-value"]').exists()).is.false;
      expect(wrapper.classes()).not.contains('resource_items_cont--team_red');
    } finally {
      wrapper.unmount();
    }
  });
});
