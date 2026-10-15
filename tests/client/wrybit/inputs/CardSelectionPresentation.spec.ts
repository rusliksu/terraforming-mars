import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import SelectCard from '@/client/components/SelectCard.vue';
import SourceSelectCard from '@/client/wrybit/inputs/SelectCard.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';
import {SelectCardModel} from '@/common/models/PlayerInputModel';
import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {handCardFilter, resetCardFilterState} from '@/client/wrybit/visuals/cardfilter/cardFilterState';

describe('card selection presentation', () => {
  afterEach(() => resetCardFilterState());

  it('preserves the single-card state shape and sends the native card response', async () => {
    const cards = [{name: CardName.ANTS}, {name: CardName.BIRDS, isDisabled: true}];
    const input: SelectCardModel = {type: 'card', title: 'Keep card', buttonLabel: 'Keep', cards,
      min: 1, max: 1, showOnlyInLearnerMode: false, selectBlueCardAction: false, showOwner: false, showSelectAll: false};
    const registry = shallowRef<InputPresentationRegistry>();
    const save = vi.fn();
    const wrapper = mount(SelectCard, {...globalConfig, props: {playerView: fakePlayerViewModel(), playerinput: input, onsave: save, showsave: true},
      global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    try {
      await wrapper.get('input[type=radio]').setValue(true);
      const uid = wrapper.vm.$.uid;
      registry.value = {card: markRaw(SourceSelectCard)};
      await flushPromises();
      expect(wrapper.findAll('input[type=radio]')).has.length(1);
      expect(wrapper.get<HTMLInputElement>('input[type=radio]').element.checked).is.true;
      expect(Array.isArray(wrapper.vm.cards)).is.false;
      expect(wrapper.vm.$.uid).eq(uid);
      expect(save.mock.calls).has.length(0);
      wrapper.vm.saveData();
      expect(save.mock.calls).deep.eq([[{type: 'card', cards: [CardName.ANTS]}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('retains multiple picks, native maximum and exact response when a filter hides the selection', async () => {
    const cards = [{name: CardName.ANTS}, {name: CardName.BIRDS}, {name: CardName.ASTEROID}];
    const input: SelectCardModel = {type: 'card', title: 'Sell patents', buttonLabel: 'Sell', cards,
      min: 0, max: 2, showOnlyInLearnerMode: false, selectBlueCardAction: false, showOwner: false, showSelectAll: true};
    const registry = shallowRef<InputPresentationRegistry>();
    const save = vi.fn();
    const wrapper = mount(SelectCard, {...globalConfig, props: {playerView: fakePlayerViewModel({cardsInHand: cards}), playerinput: input, onsave: save, showsave: true},
      global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    try {
      await wrapper.findAll('input[type=checkbox]')[0].setValue(true);
      await wrapper.findAll('input[type=checkbox]')[1].setValue(true);
      const uid = wrapper.vm.$.uid;
      registry.value = {card: markRaw(SourceSelectCard)};
      await flushPromises();
      expect(wrapper.find('[data-source-card-choice]').exists()).is.true;
      expect(wrapper.vm.$.uid).eq(uid);
      const inputs = wrapper.findAll<HTMLInputElement>('input[type=checkbox]');
      expect(inputs.map((control) => control.element.checked)).deep.eq([true, true, false]);
      expect(inputs[2].element.disabled).is.true;
      handCardFilter.tags.add(Tag.SCIENCE);
      await flushPromises();
      expect(wrapper.get('.card-filter-hidden-note').text()).contains('2');
      expect(wrapper.vm.getData()).deep.eq([CardName.ANTS, CardName.BIRDS]);
      expect(save.mock.calls).has.length(0);
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.vm.$.uid).eq(uid);
      wrapper.vm.saveData();
      expect(save.mock.calls).deep.eq([[{type: 'card', cards: [CardName.ANTS, CardName.BIRDS]}]]);
    } finally {
      wrapper.unmount();
    }
  });
});
