import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import GameBoardView from '@/client/wrybit/visuals/GameBoardView.vue';
import {ColonyName} from '@/common/colonies/ColonyName';
import type {ColonyModel} from '@/common/models/ColonyModel';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakeGameModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';

describe('source colonies board with our live metadata', () => {
  const luna: ColonyModel = {name: ColonyName.LUNA, colonies: ['pearl'], trackPosition: 4, isActive: true, visitor: undefined};
  const mercury: ColonyModel = {name: ColonyName.MERCURY, colonies: [], trackPosition: 5, isActive: true, visitor: 'red'};
  const players = [fakePublicPlayerModel({name: 'Owner', color: 'pearl', fleetSize: 2}),
    fakePublicPlayerModel({name: 'Visitor', color: 'red', fleetSize: 1, tradesThisGeneration: 1})];

  function board(viewer = false) {
    return shallowMount(GameBoardView, {props: {game: fakeGameModel({colonies: [luna, mercury]}), players, tileView: 'show',
      ...(viewer ? {viewer: fakePublicPlayerModel({color: 'pearl', colonyTradeContext: {
        version: 1, remainingActionsThisTurn: 2, allOpponentsPassed: false, tradeAvailable: true,
        tradeOffset: 1, tradeBonusMC: 0, payments: [
          {resource: 'energy', amount: 2, available: false}, {resource: 'titanium', amount: 2, available: true},
          {resource: 'megacredits', amount: 8, available: true},
        ], stockColonies: [], ordinaryProduction: true, additionalPaymentMechanism: false,
        nextGenerationTradeAccess: 'normal', gameCanContinue: true,
      }})} : {})},
    global: {...globalConfig.global, stubs: {ColoniesBoard: false, PlayerCube: true, TradeShip: true,
      BoardTabs: {template: '<div><slot name="colonies"/></div>'}}}});
  }

  it('shows native track values, the actual resource, occupants and refreshed fees', async () => {
    const wrapper = board(true);
    try {
      const tile = wrapper.get('[data-test="colony-tile-Luna"]');
      expect(tile.get('.colonies-board__big').text()).contains('10');
      expect(tile.findAll('.colonies-board__cell')).has.length(7);
      expect(tile.get('player-cube-stub').attributes('color')).eq('pearl');
      const mercuryTile = wrapper.get('[data-test="colony-tile-Mercury"]');
      expect(mercuryTile.get('.colonies-board__big img').attributes('src')).eq('assets/resources/titanium.png');
      expect(mercuryTile.get('.colonies-board__docked').text()).contains('Visitor');
      expect(wrapper.get('[data-test="colony-fee-megacredits"]').text()).eq('8');
      expect(wrapper.get('[data-test="colony-fee-energy"]').classes()).contains('colonies-board__fee--off');
      expect(wrapper.findAll('.colonies-board__berth')).has.length(3);

      await wrapper.setProps({game: fakeGameModel({colonies: [{...luna, trackPosition: 6, colonies: ['pearl', 'red']},
        {...mercury, trackPosition: 3, visitor: undefined}]})});
      expect(tile.get('.colonies-board__big').text()).contains('17');
      expect(tile.findAll('player-cube-stub').map((cube) => cube.attributes('color'))).deep.eq(['pearl', 'red']);
      expect(mercuryTile.get('.colonies-board__big img').attributes('src')).eq('assets/resources/steel.png');
      expect(mercuryTile.find('.colonies-board__docked').exists()).is.false;
      expect(wrapper.emitted('toggleTileView')).eq(undefined);
    } finally {
      wrapper.unmount();
    }
  });

  it('labels spectator fees as the base fee and renders an empty board', async () => {
    const wrapper = board();
    try {
      expect(wrapper.get('.colonies-board__fee-label').text()).contains('Base trade fee');
      expect(wrapper.get('[data-test="colony-fee-megacredits"]').text()).eq('9');
      expect(wrapper.get('[data-test="colony-fee-energy"]').text()).eq('3');
      await wrapper.setProps({game: fakeGameModel({colonies: []}), players: []});
      expect(wrapper.findAll('.colonies-board__tile')).has.length(0);
      expect(wrapper.findAll('.colonies-board__berth')).has.length(0);
    } finally {
      wrapper.unmount();
    }
  });
});
