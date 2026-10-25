import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import NativePlayer from '@/client/components/SelectPlayer.vue';
import NativeCard from '@/client/components/SelectCard.vue';
import SourceOr from '@/client/wrybit/inputs/OrOptions.vue';
import SourceCard from '@/client/wrybit/inputs/SelectCard.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {CardName} from '@/common/cards/CardName';
import {PlayerInputModel, SelectCardModel} from '@/common/models/PlayerInputModel';
import {InputResponse} from '@/common/inputs/InputResponse';

function cardChoice(title: string, cards: SelectCardModel['cards']): SelectCardModel {
  return {type: 'card', title, buttonLabel: 'Take action', cards, min: 1, max: 1,
    showOnlyInLearnerMode: false, selectBlueCardAction: true, showOwner: false, showSelectAll: false};
}

describe('source grouped choices over our native input controllers', () => {
  function form(input: PlayerInputModel, tableau: SelectCardModel['cards'] = []) {
    const red = fakePublicPlayerModel({color: 'red', name: 'Synthetic Red', tableau: [...tableau], actionsThisGeneration: [CardName.BIRDS]});
    const blue = fakePublicPlayerModel({color: 'blue', name: 'Synthetic Blue'});
    const view = fakePlayerViewModel({waitingFor: input, thisPlayer: red, players: [red, blue]});
    const registry = shallowRef<InputPresentationRegistry | undefined>({or: markRaw(SourceOr), card: markRaw(SourceCard)});
    const save = vi.fn<(response: InputResponse) => void>();
    const wrapper = mount(PlayerInputFactory, {attachTo: document.body, props: {playerView: view, playerinput: input, onsave: save, showsave: true},
      global: {...globalConfig.global, components: {PlayerInputFactory}, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    return {wrapper, registry, save};
  }

  it('selects a player tile into the native child, keeps it through classic mode and sends the original nested response', async () => {
    const input: PlayerInputModel = {type: 'or', title: 'Choose an option', buttonLabel: 'Confirm', options: [
      {type: 'option', title: 'Do nothing', buttonLabel: 'Confirm'},
      {type: 'player', title: 'Choose player', buttonLabel: 'Confirm', players: ['red', 'blue']},
    ]};
    const {wrapper, registry, save} = form(input);
    try {
      await flushPromises();
      expect(wrapper.find('.or-tabs').exists()).is.false;
      await wrapper.get('.choice-options input[value=blue]').setValue(true);
      await flushPromises();
      const child = wrapper.getComponent(NativePlayer);
      const uid = child.vm.$.uid;
      expect(child.vm.selectedPlayer).eq('blue');
      expect(save.mock.calls).has.length(0);
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent(NativePlayer).vm.$.uid).eq(uid);
      expect(wrapper.getComponent(NativePlayer).get<HTMLInputElement>('input[value=blue]').element.checked).is.true;
      wrapper.vm.saveData();
      expect(save.mock.calls.map((call) => call[0])).deep.eq([{type: 'or', index: 1, response: {type: 'player', player: 'blue'}}]);
    } finally {
      wrapper.unmount();
    }
  });

  it('combines CEO and action cards into Actions while native card selection owns the response', async () => {
    const input: PlayerInputModel = {type: 'or', title: 'Take your first action', buttonLabel: 'Take action', options: [
      cardChoice('Perform an action from a played card', [{name: CardName.ANTS}]),
      cardChoice('Use CEO once per game action', [{name: CardName.ASIMOV}]),
      {type: 'option', title: 'Pass for this generation', buttonLabel: 'Pass'},
    ]};
    const {wrapper, registry, save} = form(input, [{name: CardName.ANTS}, {name: CardName.BIRDS},
      {name: CardName.ASIMOV}, {name: CardName.APOLLO, isDisabled: true}, {name: CardName.ARCTIC_ALGAE}]);
    try {
      await flushPromises();
      expect(wrapper.find('button[data-option-index="1"]').exists()).is.false;
      expect(wrapper.get('.actions-tab-sections').text()).contains('CEO');
      expect(wrapper.get('[data-inactive-section="Actions already used"]').text()).contains('Apollo');
      expect(wrapper.get('[data-inactive-section="Actions already used"]').text()).contains('Birds');
      await wrapper.get('input[data-action-card="Asimov"]').setValue(true);
      await flushPromises();
      expect(wrapper.get('input[data-action-card="Asimov"]').element).has.property('checked', true);
      const factory = wrapper.findAllComponents(PlayerInputFactory).find((component) => component.props('playerinput').type === 'card')!;
      expect(factory.vm.selectChoice({type: 'card', name: CardName.BIRDS})).is.false;
      expect(save.mock.calls).has.length(0);
      await wrapper.get('button[title="All cards"]').trigger('click');
      const uid = factory.vm.$.uid;
      await wrapper.get('button[data-option-index="0"]').trigger('click');
      expect(wrapper.findAllComponents(PlayerInputFactory).find((component) => component.props('playerinput').type === 'card')!.vm.$.uid).eq(uid);
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent(NativeCard).vm.getData()).deep.eq([CardName.ASIMOV]);
      expect(wrapper.getComponent(NativeCard).get<HTMLInputElement>('input[type=radio]').element.checked).is.true;
      wrapper.vm.saveData();
      expect(save.mock.calls.map((call) => call[0])).deep.eq([{type: 'or', index: 1, response: {type: 'card', cards: [CardName.ASIMOV]}}]);
    } finally {
      wrapper.unmount();
    }
  });
});
