import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import Board from '@/client/wrybit/visuals/Board.vue';
import BoardSpace from '@/client/wrybit/visuals/BoardSpace.vue';
import {BoardName} from '@/common/boards/BoardName';
import {DEFAULT_EXPANSIONS} from '@/common/cards/GameModule';
import {DEFAULT_GLOBAL_PARAMETERS, GlobalParametersConfig} from '@/common/GlobalParameterConfig';
import {SpaceType} from '@/common/boards/SpaceType';
import {SpaceName} from '@/common/boards/SpaceName';
import {SpaceModel} from '@/common/models/SpaceModel';
import {SpaceId} from '@/common/Types';
import {globalConfig} from '@tests/client/components/getLocalVue';

function space(id: SpaceId, spaceType: SpaceType = SpaceType.LAND): SpaceModel {
  return {id, x: 2, y: 2, bonus: [], spaceType, color: undefined, highlight: undefined, tileType: undefined};
}

describe('Wrybit board with our track and space data', () => {
  it('uses configured rewards and custom maxima while preserving the Venus surface separation', async () => {
    const parameters: GlobalParametersConfig = {
      ...DEFAULT_GLOBAL_PARAMETERS,
      temperature: {...DEFAULT_GLOBAL_PARAMETERS.temperature, max: 20, bonuses: [{value: -18, kind: 'heatProduction', amount: 3}]},
      oxygen: {...DEFAULT_GLOBAL_PARAMETERS.oxygen, max: 24, bonuses: [{value: 5, kind: 'card', amount: 2}]},
      oceans: {max: 12},
    };
    const expansions = {...DEFAULT_EXPANSIONS, venus: true};
    const wrapper = mount(Board, {...globalConfig, props: {
      spaces: [space('100')], expansions, boardName: BoardName.CUSTOM,
      globalParameters: parameters, temperature: 12, oxygen_level: 18, oceans_count: 9, venusScaleLevel: 8,
    }});
    try {
      expect(wrapper.get('.global-numbers-temperature .val-is-active').text()).eq('+8');
      expect(wrapper.get('.global-numbers-temperature-extra').text()).eq('+2');
      expect(wrapper.get('.global-numbers-oxygen-extra').text()).eq('+4');
      expect(wrapper.get('.global-numbers-oceans').text()).eq('9/12');
      expect(wrapper.get('[data-test="mars-scale-bonus-temperature--18-0"] b').text()).eq('3');
      expect(wrapper.get('[data-test="mars-scale-bonus-oxygen-5-0"] b').text()).eq('2');
      expect(wrapper.find('[data-test="mars-scale-bonus-temperature--24-0"]').exists()).is.false;
      await wrapper.setProps({expansions: {...expansions, venusPhase2: true}});
      expect(wrapper.find('.global-numbers-venus').exists()).is.false;
      expect(wrapper.findAll('[data-test^="mars-scale-bonus-venus-"]')).has.length(0);
      expect(wrapper.classes()).contains('board-cont--venus-relocated');
      expect(wrapper.findAllComponents(BoardSpace).find((child) => child.props('space').id === '100')?.props('pixel')).deep.eq({left: 79.5, top: 116});
    } finally {
      wrapper.unmount();
    }
  });

  it('renders board player markers as fixed isometric cubes, not randomly turned tops', () => {
    const marked: SpaceModel = {...space('100'), color: 'blue'};
    const wrapper = mount(Board, {...globalConfig, props: {
      spaces: [marked], expansions: DEFAULT_EXPANSIONS, boardName: BoardName.THARSIS, tileView: 'show', venusScaleLevel: 0,
    }});
    try {
      expect(wrapper.find('.player-cube--iso').exists()).is.true;
      expect(wrapper.find('.player-cube--top').exists()).is.false;
      expect(wrapper.get('.player-cube').attributes('style') ?? '').not.contains('--wrybit-cube-turn');
    } finally {
      wrapper.unmount();
    }
  });

  it('refreshes outer-space occupancy and keeps unpainted custom rewards visible', async () => {
    const parameters: GlobalParametersConfig = {
      ...DEFAULT_GLOBAL_PARAMETERS,
      temperature: {min: -40, max: 20, step: 2, bonuses: [{value: -36, kind: 'ocean'}]},
      oxygen: {...DEFAULT_GLOBAL_PARAMETERS.oxygen, bonuses: []},
      venus: {...DEFAULT_GLOBAL_PARAMETERS.venus, bonuses: []},
    };
    const phobos = space(SpaceName.PHOBOS_SPACE_HAVEN, SpaceType.COLONY);
    const wrapper = mount(Board, {...globalConfig, props: {
      spaces: [space('100'), phobos], expansions: DEFAULT_EXPANSIONS, boardName: BoardName.CUSTOM,
      globalParameters: parameters, temperature: -38, venusScaleLevel: 0,
    }});
    try {
      expect(wrapper.find('.board-cont--custom').exists()).is.true;
      expect(wrapper.get('.mars-scale-bonus-list').text()).contains('-36');
      expect(wrapper.find('.mars-scale-bonus-list .track-bonus-chip--done').exists()).is.false;
      await wrapper.setProps({spaces: [space('100'), {...phobos, color: 'green'}], temperature: -36});
      expect(wrapper.find('.mars-scale-bonus-list .track-bonus-chip--done').exists()).is.true;
      expect(wrapper.find('#colony_spaces .player-cube--green').exists()).is.true;
      await wrapper.setProps({spaces: [space('100')]});
      expect(wrapper.find('#colony_spaces .board-space').exists()).is.false;
      await wrapper.get('[data-test="hide-tiles-button"]').trigger('click');
      expect(wrapper.emitted('toggleTileView')).has.length(1);
    } finally {
      wrapper.unmount();
    }
  });
});
