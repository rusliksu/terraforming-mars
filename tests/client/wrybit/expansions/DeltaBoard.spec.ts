import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import GameBoardView from '@/client/wrybit/visuals/GameBoardView.vue';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakeGameModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';

describe('source Delta rows with our native rewards and both markers', () => {
  it('shows the Epsilon Dample marker separately and refreshes both positions', async () => {
    const player = fakePublicPlayerModel({name: 'Own markers', color: 'pearl', deltaProject: {position: 2}, epsilonDample: {position: 9}});
    const wrapper = shallowMount(GameBoardView, {props: {game: fakeGameModel(), players: [player], viewer: player, tileView: 'show'},
      global: {...globalConfig.global, stubs: {DeltaBoard: false, BoardTrackRow: false, DeltaRewards: false,
        BoardTabs: {template: '<div><slot name="delta"/></div>'}}}});
    try {
      expect(wrapper.find('.delta-board').exists()).is.true;
      expect(wrapper.findAll('.board-track-row')).has.length(2);
      const positions = () => wrapper.findAll('.board-track-row').map((row) => row.findAll('.board-track-row__cell').findIndex((cell) => cell.classes().includes('board-track-row__cell--at')));
      expect(positions()).deep.eq([2, 9]);
      expect(wrapper.findAll('.delta-rewards')).has.length(2);
      expect(wrapper.get('.delta-rewards').findAll('.delta-reward')).has.length(11);
      expect(wrapper.findAll('.delta-reward .red-arrow')).has.length(2);
      expect(wrapper.findAll('.delta-board__row--self')).has.length(2);
      await wrapper.setProps({players: [{...player, deltaProject: {...player.deltaProject!, position: 3}, epsilonDample: {...player.epsilonDample!, position: 10}}]});
      expect(positions()).deep.eq([3, 10]);
      expect(wrapper.emitted()).deep.eq({});
    } finally {
      wrapper.unmount();
    }
  });
});
