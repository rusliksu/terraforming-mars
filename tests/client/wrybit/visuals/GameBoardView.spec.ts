import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import GameBoardView from '@/client/wrybit/visuals/GameBoardView.vue';
import {fakeGameModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {BoardName} from '@/common/boards/BoardName';

describe('Wrybit game board presentation', () => {
  it('passes our custom board and expansion props while preserving every custom panel slot', () => {
    const game = fakeGameModel({gameOptions: {boardName: BoardName.CUSTOM, customBoardRows: 11,
      expansions: {conglomerates: true, moreParties: true}}, moon: {spaces: []}, venusPhase2: {spaces: []},
    highOrbitMarket: [], conglomerates: {teams: []}});
    const wrapper = shallowMount(GameBoardView, {...globalConfig, props: {game, players: [fakePublicPlayerModel(), fakePublicPlayerModel({color: 'red'})], tileView: 'coords'},
      global: {...globalConfig.global, stubs: {Teleport: false, Board: false, Milestones: false, Awards: false,
        BoardTabs: {template: '<div><slot name="mars"/><slot name="moon"/><slot name="venus"/><slot name="orbit"/><slot name="teams"/></div>'}}}});
    try {
      const board = wrapper.getComponent({name: 'Board'});
      expect(board.props('boardName')).eq(BoardName.CUSTOM);
      expect(board.props('customBoardRows')).eq(11);
      expect(board.props('tileView')).eq('coords');
      expect(wrapper.findComponent({name: 'MoonBoard'}).exists()).is.true;
      expect(wrapper.findComponent({name: 'VenusSurfaceBoard'}).exists()).is.true;
      expect(wrapper.findComponent({name: 'HighOrbitMarket'}).exists()).is.true;
      expect(wrapper.findComponent({name: 'ConglomeratesTeams'}).exists()).is.true;
      expect(wrapper.getComponent({name: 'Milestones'}).attributes('conglomeratesexpansion')).eq('true');
      board.vm.$emit('toggleTileView');
      expect(wrapper.emitted('toggleTileView')).has.length(1);
    } finally {
      wrapper.unmount();
    }
  });
});
