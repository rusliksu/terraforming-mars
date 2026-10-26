import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import NativeCard from '@/client/components/SelectCard.vue';
import SourceCard from '@/client/wrybit/inputs/SelectCard.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {CardName} from '@/common/cards/CardName';
import {CardModel} from '@/common/models/CardModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {SelectCardModel} from '@/common/models/PlayerInputModel';
import {Phase} from '@/common/Phase';
import {resetCardFilterState} from '@/client/wrybit/visuals/cardfilter/cardFilterState';

function selection(cards: ReadonlyArray<CardModel>, min = 1, max = 1): SelectCardModel {
  return {type: 'card', title: 'Select a card to keep', buttonLabel: 'Select', cards, min, max,
    showOnlyInLearnerMode: false, selectBlueCardAction: false, showOwner: false, showSelectAll: false};
}

describe('source draft and trailing sections with our native selection', () => {
  afterEach(() => {
    sessionStorage.clear();
    resetCardFilterState();
  });
  function form(input: SelectCardModel, overrides: Partial<PlayerViewModel> = {}) {
    const registry = shallowRef<InputPresentationRegistry | undefined>({card: markRaw(SourceCard)});
    const save = vi.fn();
    const view = fakePlayerViewModel({...overrides, waitingFor: input});
    const wrapper = mount(NativeCard, {attachTo: document.body, props: {playerView: view, playerinput: input, onsave: save, showsave: true},
      global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    return {wrapper, registry, save};
  }
  function draftView(draftedCards: ReadonlyArray<CardModel>, needsToDraft: boolean): Partial<PlayerViewModel> {
    return {game: fakeGameModel({phase: Phase.DRAFTING}), draftedCards,
      thisPlayer: fakePublicPlayerModel({needsToDraft})};
  }

  it('accepts an intermediate native selection within the offered minimum and maximum across layouts', async () => {
    const input = selection([{name: CardName.ANTS}, {name: CardName.BIRDS}, {name: CardName.ASTEROID}], 1, 3);
    const {wrapper, registry} = form(input);
    try {
      registry.value = undefined;
      await flushPromises();
      const inputs = wrapper.findAll('input[type=checkbox]');
      await inputs[0].setValue(true);
      await inputs[1].setValue(true);
      expect(wrapper.vm.canSave()).is.true;
      registry.value = {card: markRaw(SourceCard)};
      await flushPromises();
      expect(wrapper.get<HTMLButtonElement>('.select-card-actions button').element.disabled).is.false;
      expect(wrapper.vm.getData()).deep.eq([CardName.ANTS, CardName.BIRDS]);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps packet order through native repick, shows previous keeps and clears only the proposed replacement', async () => {
    const initial = selection([{name: CardName.ANTS}, {name: CardName.BIRDS}, {name: CardName.ASTEROID}]);
    const first = form(initial, draftView([{name: CardName.ACQUIRED_COMPANY}], true));
    try {
      await flushPromises();
      expect(first.wrapper.findAll('[data-source-card-choice] > label[data-card-name]').map((label) => label.attributes('data-card-name')))
        .deep.eq([CardName.ANTS, CardName.BIRDS, CardName.ASTEROID]);
    } finally {
      first.wrapper.unmount();
    }
    const input = {...selection([{name: CardName.ANTS}, {name: CardName.ASTEROID}, {name: CardName.BIRDS, isDisabled: true}]), optional: true};
    const original = JSON.stringify(input);
    const {wrapper, registry, save} = form(input, draftView([{name: CardName.ACQUIRED_COMPANY}, {name: CardName.BIRDS}], false));
    try {
      await flushPromises();
      const ownerId = wrapper.vm.$.uid;
      expect(wrapper.findAll('[data-source-card-choice] > label[data-card-name]').map((label) => label.attributes('data-card-name')))
        .deep.eq([CardName.ANTS, CardName.BIRDS, CardName.ASTEROID]);
      expect(wrapper.get('.current-pick-tab').text()).contains('Your pick');
      expect(wrapper.get('[data-trailing-section="Drafted cards"]').text()).contains('Acquired Company');
      expect(wrapper.get('[data-trailing-section="Drafted cards"]').findAll('input')).has.length(0);
      expect(wrapper.get<HTMLButtonElement>('.select-card-actions button').element.disabled).is.true;
      await wrapper.get('label[data-card-name="Ants"] input').setValue(true);
      expect(wrapper.vm.getData()).deep.eq([CardName.ANTS]);
      expect(wrapper.get('.current-pick-tab').text()).eq('Previous pick');
      await wrapper.get('.current-pick-tab').trigger('click');
      expect(wrapper.vm.getData()).deep.eq([]);
      expect(save.mock.calls).has.length(0);
      await wrapper.get('label[data-card-name="Asteroid"] input').setValue(true);
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.vm.$.uid).eq(ownerId);
      expect(wrapper.vm.getData()).deep.eq([CardName.ASTEROID]);
      wrapper.vm.saveData();
      expect(save.mock.calls).deep.eq([[{type: 'card', cards: [CardName.ASTEROID]}]]);
      expect(JSON.stringify(input)).eq(original);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps native two-card repicks enabled and counts only the new proposed selection', async () => {
    const input = {...selection([{name: CardName.ANTS}, {name: CardName.BIRDS}, {name: CardName.ASTEROID}], 2, 2), optional: true};
    const {wrapper, save} = form(input, draftView([{name: CardName.ANTS}, {name: CardName.BIRDS}], false));
    try {
      await flushPromises();
      expect(wrapper.findAll('.current-pick-tab')).has.length(2);
      const submit = wrapper.get<HTMLButtonElement>('.select-card-actions button');
      expect(submit.element.disabled).is.true;
      await wrapper.get('label[data-card-name="Ants"] input').setValue(true);
      expect(submit.element.disabled).is.true;
      await wrapper.get('label[data-card-name="Asteroid"] input').setValue(true);
      expect(submit.element.disabled).is.false;
      await submit.trigger('click');
      expect(save.mock.calls).deep.eq([[{type: 'card', cards: [CardName.ANTS, CardName.ASTEROID]}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows our used action cards as a view-only section without selectable CEO grouping', async () => {
    const input = {...selection([{name: CardName.ANTS}]), title: 'Perform an action from a played card', selectBlueCardAction: true};
    const {wrapper, save} = form(input, {thisPlayer: fakePublicPlayerModel({
      tableau: [{name: CardName.ANTS}, {name: CardName.BIRDS}], actionsThisGeneration: [CardName.BIRDS],
    })});
    try {
      await flushPromises();
      const section = wrapper.get('[data-trailing-section="Actions already used"]');
      expect(section.text()).contains('Birds');
      expect(section.findAll('input')).has.length(0);
      await section.get('.cardbox').trigger('click');
      expect(wrapper.vm.getData()).deep.eq([]);
      expect(save.mock.calls).has.length(0);
    } finally {
      wrapper.unmount();
    }
  });

  it('explains the native zero-card affordability offer and discards with the native empty response', async () => {
    const input = {...selection([{name: CardName.ASTEROID}], 0, 0), title: 'You cannot afford any cards', buttonLabel: 'Buy'};
    const {wrapper, save} = form(input, {thisPlayer: fakePublicPlayerModel({cardCost: 3, megacredits: 1})});
    try {
      await flushPromises();
      expect(wrapper.get('.select-card-unaffordable').text()).contains('a card costs 3 M€');
      const buy = wrapper.findAll('button').find((button) => button.text() === 'Buy')!;
      expect((buy.element as HTMLButtonElement).disabled).is.true;
      await wrapper.findAll('button').find((button) => button.text().startsWith('Discard'))!.trigger('click');
      expect(save.mock.calls).deep.eq([[{type: 'card', cards: []}]]);
    } finally {
      wrapper.unmount();
    }
  });
});
