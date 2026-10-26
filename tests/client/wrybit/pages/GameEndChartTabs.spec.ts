import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import GameEndChartTabs from '@/client/wrybit/pages/gameend/GameEndChartTabs.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit GameEndChartTabs', () => {
  it('renders both source chart tabs in the result layout', () => {
    const wrapper = mount(GameEndChartTabs, {
      ...globalConfig,
      props: {
        victoryPointDatasets: [],
        globalParameterDatasets: [],
        generation: 9,
      },
    });
    expect(wrapper.text()).contains('Victory Points');
    expect(wrapper.text()).contains('Global parameters');
    wrapper.unmount();
  });
});
