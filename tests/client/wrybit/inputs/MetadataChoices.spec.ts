import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import SourceOr from '@/client/wrybit/inputs/OrOptions.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {fakeGameModel, fakePlayerViewModel, fakePoliticalAgendasModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {OrOptionsModel} from '@/common/models/PlayerInputModel';
import {GameModel} from '@/common/models/GameModel';
import {PartyName} from '@/common/turmoil/PartyName';
import {getAgendaOrThrow} from '@/client/turmoil/ClientAgendaManifest';
import {boardTabState, selectBoardTab} from '@/client/wrybit/visuals/boardTabs/boardTabState';
import {milestonesAwardsFocusState} from '@/client/wrybit/visuals/logpanel/milestonesAwardsFocus';

describe('source metadata choice tiles with native options', () => {
  function form(input: OrOptionsModel, game: GameModel) {
    const registry = shallowRef<InputPresentationRegistry | undefined>({or: markRaw(SourceOr)});
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {attachTo: document.body,
      props: {playerView: fakePlayerViewModel({game}), playerinput: input, onsave: save, showsave: true},
      global: {...globalConfig.global, components: {PlayerInputFactory}, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    return {wrapper, registry, save};
  }

  it('renders native milestone models and keeps the exact option response through classic mode', async () => {
    const game = fakeGameModel({milestones: ['Builder', 'Gardener'].map((name) => ({
      name: name as 'Builder' | 'Gardener', color: undefined, playerName: undefined, scores: [],
    }))});
    const input: OrOptionsModel = {type: 'or', title: 'Claim a milestone', buttonLabel: 'Claim',
      options: ['Builder', 'Gardener'].map((title) => ({type: 'option', title, buttonLabel: 'Claim'}))};
    const initialFocus = milestonesAwardsFocusState.requests;
    const {wrapper, registry, save} = form(input, game);
    try {
      await flushPromises();
      expect(milestonesAwardsFocusState.requests).eq(initialFocus + 1);
      await wrapper.get('.ma-options input[data-option-index="1"]').setValue(true);
      expect(wrapper.get('.ma-options').text()).contains('Gardener');
      registry.value = undefined;
      await flushPromises();
      expect(milestonesAwardsFocusState.requests).eq(initialFocus);
      expect(wrapper.findAll<HTMLInputElement>('.wf-option > label > input')[1].element.checked).is.true;
      wrapper.vm.saveData();
      expect(save.mock.calls).deep.eq([[{type: 'or', index: 1, response: {type: 'option'}}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses all native parties and More Parties agendas for plain options, with a unique stays-here card', async () => {
    const game = fakeGameModel();
    const parties = Object.values(PartyName);
    game.gameOptions.expansions.moreParties = true;
    game.turmoil = {ruling: PartyName.KELVINISTS, dominant: PartyName.POPULISTS, chairman: undefined,
      lobby: [], reserve: [], distant: undefined, coming: undefined, current: undefined, policyActionUsers: [],
      politicalAgendas: fakePoliticalAgendasModel(), parties: parties.map((name) => ({name, partyLeader: undefined, delegates: []}))};
    const input: OrOptionsModel = {type: 'or', title: 'Choose an option', buttonLabel: 'Select',
      options: parties.map((party) => ({type: 'option', title: party === PartyName.KELVINISTS ? 'Do not move' : party, buttonLabel: 'Select'}))};
    const previousTab = boardTabState.active;
    selectBoardTab('mars');
    const {wrapper, registry, save} = form(input, game);
    try {
      await flushPromises();
      expect(wrapper.findAll('.select-party__card')).has.length(parties.length);
      expect(boardTabState.active).eq('turmoil');
      const card = wrapper.get('[data-test="party-Kelvinists"]');
      expect(card.text()).contains('Stays here');
      expect(card.text()).contains(getAgendaOrThrow('kp01', true).description);
      await wrapper.get('[data-test="party-Populists"] input').setValue(true);
      registry.value = undefined;
      await flushPromises();
      expect(boardTabState.active).eq('mars');
      wrapper.vm.saveData();
      expect(save.mock.calls).deep.eq([[{type: 'or', index: parties.indexOf(PartyName.POPULISTS), response: {type: 'option'}}]]);
    } finally {
      wrapper.unmount();
      selectBoardTab(previousTab);
    }
  });
});
