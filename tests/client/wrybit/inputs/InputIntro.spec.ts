import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import InputIntro from '@/client/wrybit/inputs/InputIntro.vue';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {TileType} from '@/common/TileType';
import {DEFAULT_GLOBAL_PARAMETERS} from '@/common/GlobalParameterConfig';

describe('source input intros from native display data', () => {
  it('shows the actual tile despite an ambiguous caption and uses our custom ocean maximum', async () => {
    const view = fakePlayerViewModel();
    view.game.oceans = 4;
    view.game.gameOptions.globalParameters = {...DEFAULT_GLOBAL_PARAMETERS, oceans: {max: 15}};
    const wrapper = mount(InputIntro, {...globalConfig, props: {playerView: view,
      input: {type: 'space', title: 'Select space for city tile', buttonLabel: 'Place', spaces: ['03'], tileType: TileType.OCEAN}}});
    try {
      expect(wrapper.find('.board-space-tile--ocean').exists()).is.true;
      expect(wrapper.text()).contains('4 of 15 oceans are already on Mars');
      expect(wrapper.find('[data_space_id]').exists()).is.false;
      await wrapper.setProps({input: {type: 'space', title: 'Select a space', buttonLabel: 'Place', spaces: ['03'], tileType: TileType.GREENERY}});
      expect(wrapper.find('.board-space-tile--greenery').exists()).is.true;
      expect(wrapper.text()).not.contains('oceans');
      await wrapper.setProps({input: {type: 'space', title: 'Select space for city tile', buttonLabel: 'Place', spaces: ['03']}});
      expect(wrapper.find('.placement-tile-preview').exists()).is.false;
      expect(wrapper.text()).eq('Select space for city tile');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses our custom tile art and preserves the full translated message caption', () => {
    const title = {message: 'Select ${0}', data: [{type: 0, value: 'a cell'}]};
    const wrapper = mount(InputIntro, {...globalConfig, props: {playerView: fakePlayerViewModel(),
      input: {type: 'space', title, buttonLabel: 'Place', spaces: ['03'], tileType: TileType.VENUS_GAS_MINE}}});
    try {
      expect(wrapper.find('.board-space-tile--venus-gas-mine').exists()).is.true;
      expect(wrapper.text()).eq('Select a cell');
      expect(title.message).eq('Select ${0}');
    } finally {
      wrapper.unmount();
    }
  });
});
