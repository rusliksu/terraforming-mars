import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import GameBoardView from '@/client/wrybit/visuals/GameBoardView.vue';
import TurmoilBoard from '@/client/wrybit/expansions/turmoil/TurmoilBoard.vue';
import {PartyName} from '@/common/turmoil/PartyName';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import type {TurmoilModel} from '@/common/models/TurmoilModel';
import {getAgendaOrThrow} from '@/client/turmoil/ClientAgendaManifest';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakeGameModel, fakePoliticalAgendasModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';

describe('source committee board over our public turmoil model', () => {
  it('preserves delegates beyond the twelve seats and refreshes their exact colors and counts', async () => {
    const party = {name: PartyName.GREENS, partyLeader: 'blue' as const, delegates: [{color: 'blue' as const, number: 7}, {color: 'red' as const, number: 7}]};
    const turmoil: TurmoilModel = {ruling: undefined, dominant: undefined, chairman: undefined, parties: [party],
      lobby: [], reserve: [], distant: undefined, coming: undefined, current: undefined, politicalAgendas: undefined, policyActionUsers: []};
    const wrapper = shallowMount(TurmoilBoard, {props: {turmoil, generation: 2, moreParties: false, betterMars: false},
      global: {...globalConfig.global, stubs: {DelegateFigure: true, TurmoilEventCard: true}}});
    try {
      const overflow = () => wrapper.get('[data-test="overflow-Greens"]');
      expect(overflow().get('delegate-figure-stub').attributes('color')).eq('red');
      expect(overflow().get('[data-color="red"]').text()).eq('+1');
      await wrapper.setProps({turmoil: {...turmoil, parties: [{...party,
        delegates: [{color: 'blue', number: 7}, {color: 'red', number: 6}, {color: 'pearl', number: 2}]}]}});
      expect(overflow().get('delegate-figure-stub').attributes('color')).eq('pearl');
      expect(overflow().get('[data-color="pearl"]').text()).eq('+2');
      expect(overflow().find('[data-color="red"]').exists()).is.false;
      await wrapper.setProps({turmoil: {...turmoil, parties: [{...party,
        delegates: [{color: 'blue', number: 7}, {color: 'red', number: 6}]}]}});
      expect(wrapper.find('[data-test="overflow-Greens"]').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });

  it('uses our agendas, reserve counts, custom parties and refreshed event slots', async () => {
    const turmoil: TurmoilModel = {ruling: PartyName.KELVINISTS, dominant: PartyName.POPULISTS, chairman: 'pearl',
      parties: [{name: PartyName.KELVINISTS, partyLeader: 'blue', delegates: [{color: 'blue', number: 2}]},
        {name: PartyName.POPULISTS, partyLeader: 'pearl', delegates: [{color: 'pearl', number: 1}]}],
      reserve: [{color: 'neutral', number: 2}, {color: 'pearl', number: 7}], lobby: ['pearl'],
      current: GlobalEventName.GLOBAL_DUST_STORM, coming: undefined, distant: undefined,
      politicalAgendas: fakePoliticalAgendasModel(),
      policyActionUsers: [{color: 'pearl', turmoilPolicyActionUsed: true, politicalAgendasActionUsedCount: 2}]};
    const game = fakeGameModel({turmoil, generation: 8});
    game.gameOptions.expansions.moreParties = true;
    const wrapper = shallowMount(GameBoardView, {props: {game, players: [], tileView: 'show', viewer: fakePublicPlayerModel({color: 'pearl', influence: 4})},
      global: {...globalConfig.global, stubs: {TurmoilBoard: false, DelegateFigure: true, TurmoilEventCard: true,
        BoardTabs: {template: '<div><slot name="turmoil"/></div>'}}}});
    try {
      expect(wrapper.find('.turmoil-board-tab').exists()).is.true;
      expect(wrapper.get('.turmoil-board-tab__policy-text').text()).contains(getAgendaOrThrow('kp01', true).description);
      expect(wrapper.get('[data-test="neutral-reserve"]').text()).contains('2');
      expect(wrapper.get('[data-test="reserve-pearl"]').text()).contains('7');
      expect(wrapper.get('.turmoil-board-tab__influence').text()).contains('4');
      expect(wrapper.get('[data-test="committee-Populists"]').text()).contains('Successor');
      expect(wrapper.get('[data-test="policy-user-pearl"]').text()).contains('2');
      expect(wrapper.get('turmoil-event-card-stub').attributes('generation')).eq('8');
      expect(wrapper.findAll('delegate-figure-stub').some((figure) => figure.attributes('color') === 'pearl')).is.true;
      const updated = {...game, turmoil: {...turmoil, reserve: [{color: 'neutral' as const, number: 0}], current: undefined,
        coming: GlobalEventName.GLOBAL_DUST_STORM, policyActionUsers: []}};
      updated.gameOptions = {...game.gameOptions, expansions: {...game.gameOptions.expansions, moreParties: false}};
      await wrapper.setProps({game: updated});
      expect(wrapper.get('.turmoil-board-tab__policy-text').text()).contains(getAgendaOrThrow('kp01', false).description);
      expect(wrapper.get('[data-test="neutral-reserve"]').text()).contains('0');
      expect(wrapper.get('turmoil-event-card-stub').attributes('generation')).eq('9');
      expect(wrapper.find('[data-test="policy-user-pearl"]').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
