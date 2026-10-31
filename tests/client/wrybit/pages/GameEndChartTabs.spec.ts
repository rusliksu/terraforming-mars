import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import GameEndChartTabs from '@/client/wrybit/pages/gameend/GameEndChartTabs.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {PLAYER_CHART_COLORS} from '@/client/wrybit/pages/gameend/chartStyles';

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

  it('has a visible colour for every real player palette', () => {
    const colors = ['red', 'green', 'yellow', 'blue', 'black', 'purple', 'orange', 'pink',
      'gold', 'emerald', 'ginger', 'pearl', 'antistress', 'gambit', 'turquoise', 'vanger', 'serge',
      'credicor', 'rigatone', 'rigatone2', 'hydro', 'saturn', 'saturnrings', 'titan', 'saturnstorm', 'catseye'] as const;
    for (const color of colors) {
      expect(PLAYER_CHART_COLORS[color], color).to.be.a('string').and.not.eq('');
    }
  });
});
