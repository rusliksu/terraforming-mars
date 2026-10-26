import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import BoardTabs from '@/client/wrybit/visuals/boardTabs/BoardTabs.vue';
import BoardTabLines from '@/client/wrybit/visuals/boardTabs/BoardTabLines.vue';
import {boardTabs, boardTabTracks} from '@/client/wrybit/visuals/boardTabs/boardTabs';
import {DEFAULT_GLOBAL_PARAMETERS} from '@/common/GlobalParameterConfig';
import {fakeGameModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import * as boardFit from '@/client/wrybit/visuals/boardTabs/boardTabFit';
import {selectBoardTab} from '@/client/wrybit/visuals/boardTabs/boardTabState';
import {ColonyName} from '@/common/colonies/ColonyName';

describe('Wrybit board tabs over our models', () => {
  it('uses custom track minima, steps, bonuses and ocean limit, including the Phase 2 Venus override', () => {
    const game = fakeGameModel({temperature: -10, oxygenLevel: 4, oceans: 2, venusScaleLevel: 12, gameOptions: {
      expansions: {venus: true}, globalParameters: {...DEFAULT_GLOBAL_PARAMETERS,
        temperature: {min: -40, max: 20, step: 5, bonuses: [{value: -10, kind: 'ocean'}]},
        oxygen: {min: 2, max: 20, step: 2, bonuses: [{value: 10, kind: 'temperature'}]}, oceans: {max: 12},
        venus: {min: 0, max: 40, step: 4, bonuses: [{value: 12, kind: 'card', amount: 1}]}},
    }});
    expect(boardTabTracks(game, [], 'mars').map(({step, total, bonus}) => ({step, total, bonus}))).deep.eq([
      {step: 6, total: 12, bonus: [6]}, {step: 1, total: 9, bonus: [4]}, {step: 2, total: 12, bonus: []}, {step: 3, total: 10, bonus: [3]},
    ]);
    game.venusPhase2 = {spaces: []};
    game.gameOptions.altVenusBoard = true;
    expect(boardTabTracks(game, [], 'mars')[3].total).eq(15);
    expect(boardTabs(game)).includes('venus');
    const players = [fakePublicPlayerModel({color: 'red', deltaProject: {position: 12}, epsilonDample: {position: 11}})];
    expect(boardTabTracks(game, players, 'delta')[0].markers).deep.eq([{at: 12, color: 'red'}, {at: 11, color: 'red'}]);
    expect(boardTabTracks(game, players, 'delta')[0].total).eq(13);
  });

  it('keeps inactive boards mounted and releases only its own fit observer when another table unmounts', async () => {
    const cleanup: Array<ReturnType<typeof vi.fn>> = [];
    const fit = vi.spyOn(boardFit, 'observeBoardTabFit').mockImplementation(() => {
      const stop = vi.fn();
      cleanup.push(stop);
      return stop;
    });
    selectBoardTab('mars');
    const props = {game: fakeGameModel({colonies: [{name: ColonyName.LUNA, colonies: [], isActive: true, trackPosition: 2, visitor: undefined}]}), players: [], tileView: 'show'} as const;
    const options = {...globalConfig, props, slots: {mars: '<div data-test="mars-board">Mars</div>', colonies: '<div data-test="colony-board">Luna</div>'}};
    const first = mount(BoardTabs, options);
    const second = mount(BoardTabs, options);
    try {
      first.unmount();
      expect(cleanup[0].mock.calls).has.length(1);
      expect(cleanup[1].mock.calls).has.length(0);
      await second.get('[data-test="board-tab-colonies"]').trigger('click');
      expect(second.find('[data-test="mars-board"]').exists()).is.true;
      expect(second.find('[data-test="colony-board"]').exists()).is.true;
    } finally {
      first.unmount();
      second.unmount();
      fit.mockRestore();
      selectBoardTab('mars');
    }
  });

  it('shows coincident Delta markers and the last position without shifting its bonus', () => {
    const wrapper = mount(BoardTabLines, {...globalConfig, props: {tracks: [{color: '#fff', step: 0, total: 13, bonus: [11, 12],
      markers: [{at: 11, color: 'red'}, {at: 11, color: 'blue'}, {at: 12, color: 'yellow'}]}]}});
    try {
      const cells = wrapper.findAll('i');
      expect(cells).has.length(13);
      expect(cells[11].attributes('style')).contains('linear-gradient');
      expect(cells[11].classes()).contains('board-tab-line__next');
      expect(cells[12].attributes('style')).contains('background');
    } finally {
      wrapper.unmount();
    }
  });
});
