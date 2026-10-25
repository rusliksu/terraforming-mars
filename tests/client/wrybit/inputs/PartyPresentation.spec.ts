import {flushPromises, mount, VueWrapper} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import SelectParty from '@/client/components/SelectParty.vue';
import SourceParty from '@/client/wrybit/inputs/SelectParty.vue';
import DelegateFigure from '@/client/wrybit/inputs/DelegateFigure.vue';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {boardTabState, selectBoardTab} from '@/client/wrybit/visuals/boardTabs/boardTabState';
import {getAgendaOrThrow} from '@/client/turmoil/ClientAgendaManifest';
import {PartyName} from '@/common/turmoil/PartyName';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakeGameModel, fakePlayerViewModel, fakePoliticalAgendasModel} from '@tests/client/components/testHelpers';

describe('source party choice with our agenda data and controller', () => {
  it('uses our More Parties variant, refreshes it and retains the selected allowed party across modes', async () => {
    const previousTab = boardTabState.active;
    selectBoardTab('mars');
    const game = fakeGameModel();
    game.gameOptions.expansions.moreParties = true;
    game.turmoil = {ruling: PartyName.KELVINISTS, dominant: PartyName.POPULISTS, chairman: undefined,
      lobby: [], reserve: [], distant: undefined, coming: undefined, current: undefined, policyActionUsers: [],
      politicalAgendas: fakePoliticalAgendasModel(), parties: [
        {name: PartyName.KELVINISTS, partyLeader: 'pearl', delegates: [{color: 'pearl', number: 2}, {color: 'blue', number: 1}]},
        {name: PartyName.POPULISTS, partyLeader: undefined, delegates: []},
        {name: PartyName.SCIENTISTS, partyLeader: 'blue', delegates: [{color: 'blue', number: 1}]},
      ]};
    const registry = shallowRef<InputPresentationRegistry | undefined>({party: markRaw(SourceParty)});
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {props: {playerView: fakePlayerViewModel({game}),
      playerinput: {type: 'party', title: 'Choose party', buttonLabel: 'Send', parties: [PartyName.KELVINISTS, PartyName.POPULISTS]}, onsave: save, showsave: true},
    global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    try {
      await flushPromises();
      const owner = wrapper.findAllComponents(SelectParty).find((child) => child.vm.$.type === SelectParty)!;
      const uid = owner.vm.$.uid;
      const card = wrapper.get('[data-test="party-Kelvinists"]');
      const morePolicy = getAgendaOrThrow('kp01', true).description;
      const standardPolicy = getAgendaOrThrow('kp01', false).description;
      expect(morePolicy).not.eq(standardPolicy);
      expect(card.get('.select-party__rule--policy').text()).contains(morePolicy);
      expect(card.get('.select-party__leader').getComponent(PlayerCube).props('color')).eq('pearl');
      const delegates: VueWrapper<InstanceType<typeof DelegateFigure>>[] = card.get('.select-party__seats').findAllComponents(DelegateFigure);
      expect(delegates.map((figure) => figure.props('color'))).deep.eq(['pearl', 'blue']);
      expect(wrapper.find('[data-test="party-Populists"] .select-party__seat').exists()).is.true;
      expect(wrapper.get<HTMLInputElement>('[data-test="party-Scientists"] input').element.disabled).is.true;
      expect(boardTabState.active).eq('turmoil');
      await card.get('input').setValue(true);
      const refreshed = JSON.parse(JSON.stringify(game));
      refreshed.gameOptions.expansions.moreParties = false;
      await wrapper.setProps({playerView: fakePlayerViewModel({game: refreshed})});
      expect(card.get('.select-party__rule--policy').text()).contains(standardPolicy);
      expect(save.mock.calls).has.length(0);
      registry.value = undefined;
      await wrapper.vm.$nextTick();
      expect(owner.vm.$.uid).eq(uid);
      expect(owner.vm.selectedParty).eq(PartyName.KELVINISTS);
      expect(boardTabState.active).eq('mars');
      expect(wrapper.vm.saveData()).eq('saved');
      expect(save.mock.calls).deep.eq([[{type: 'party', partyName: PartyName.KELVINISTS}]]);
    } finally {
      wrapper.unmount();
      selectBoardTab(previousTab);
    }
  });
});
