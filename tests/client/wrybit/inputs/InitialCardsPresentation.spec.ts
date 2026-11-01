import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import SelectInitialCards from '@/client/components/SelectInitialCards.vue';
import SelectCard from '@/client/components/SelectCard.vue';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';
import SourceInitialCards from '@/client/wrybit/inputs/SelectInitialCards.vue';
import SourceCard from '@/client/wrybit/inputs/SelectCard.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {CardName} from '@/common/cards/CardName';
import {SelectCardModel} from '@/common/models/PlayerInputModel';
import * as titles from '@/common/inputs/SelectInitialCards';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';

function choice(title: string, names: Array<CardName>, min: number, max: number): SelectCardModel {
  return {type: 'card', title, cards: names.map((name) => ({name})), min, max, buttonLabel: 'Select',
    showOnlyInLearnerMode: false, selectBlueCardAction: false, showOwner: false, showSelectAll: false};
}

function fixture(withExtras: boolean) {
  const options = [choice(titles.SELECT_CORPORATION_TITLE, [CardName.POLYPHEMOS], 1, 1)];
  if (withExtras) {
    options.push(choice(titles.SELECT_PRELUDE_TITLE, [CardName.ALLIED_BANK], 1, 1));
    options.push(choice(titles.SELECT_CEO_TITLE, [CardName.FLOYD], 1, 1));
  }
  options.push(choice(titles.SELECT_PROJECTS_TITLE, [CardName.ANTS, CardName.BIRDS], 0, 2));
  const views: InputPresentationRegistry = {initialCards: markRaw(SourceInitialCards), card: markRaw(SourceCard)};
  const registry = shallowRef<InputPresentationRegistry | undefined>(views);
  const save = vi.fn();
  const wrapper = mount(PlayerInputFactory, {props: {playerView: fakePlayerViewModel(),
    playerinput: {type: 'initialCards', title: 'Start', buttonLabel: 'Start', options}, onsave: save, showsave: true},
  global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
  return {wrapper, registry, views, save};
}

describe('source startup columns with our setup owner', () => {
  let storage: FakeLocalStorage;
  beforeEach(() => {
    storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
    PreferencesManager.INSTANCE.set('show_alerts', true);
  });
  afterEach(() => {
    FakeLocalStorage.deregister(storage);
    PreferencesManager.resetForTest();
  });

  it('uses our special purchase price and one-prelude requirement while retaining all four selectors', async () => {
    const {wrapper, registry, views, save} = fixture(true);
    try {
      await flushPromises();
      const selectorIds = () => wrapper.findAllComponents(SelectCard).filter((child) => child.vm.$.type === SelectCard).map((child) => child.vm.$.uid);
      const ids = selectorIds();
      expect(ids).has.length(4);
      expect(wrapper.get('.select-initial-cards-start').attributes('disabled')).not.eq(undefined);
      await wrapper.get('.setup-column--corporation input[type=radio]').setValue(true);
      expect(wrapper.get('.setup-summary-item--status').text()).contains('Select 1 prelude');
      await wrapper.get('.setup-column--prelude input[type=radio]').setValue(true);
      await wrapper.get('.setup-column--ceo input[type=radio]').setValue(true);
      await wrapper.get('.setup-column--projects input[type=checkbox]').setValue(true);
      expect(wrapper.get('[data-test=starting]').text()).eq('50');
      expect(wrapper.get('[data-test=purchase]').text()).eq('−5');
      expect(wrapper.get('[data-test=preludes]').text()).eq('+3');
      expect(wrapper.get('[data-test=remaining]').text()).eq('48');
      registry.value = undefined;
      await wrapper.vm.$nextTick();
      expect(selectorIds()).deep.eq(ids);
      expect(wrapper.getComponent(SelectInitialCards).vm.selectedCards).deep.eq([CardName.ANTS]);
      registry.value = views;
      await wrapper.vm.$nextTick();
      expect(selectorIds()).deep.eq(ids);
      expect(wrapper.get('[data-test=remaining]').text()).eq('48');
      expect(save.mock.calls).has.length(0);
      await wrapper.get('.select-initial-cards-start').trigger('click');
      expect(save.mock.calls).deep.eq([[{type: 'initialCards', responses: [
        {type: 'card', cards: [CardName.POLYPHEMOS]}, {type: 'card', cards: [CardName.ALLIED_BANK]},
        {type: 'card', cards: [CardName.FLOYD]}, {type: 'card', cards: [CardName.ANTS]},
      ]}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps our empty-purchase confirmation and chosen corporation through a view change', async () => {
    const {wrapper, registry, save} = fixture(false);
    try {
      await flushPromises();
      await wrapper.get('.setup-column--corporation input[type=radio]').setValue(true);
      await wrapper.get('.select-initial-cards-start').trigger('click');
      const confirmation = wrapper.getComponent(ConfirmDialog);
      const id = confirmation.vm.$.uid;
      expect(confirmation.vm.shown).is.true;
      expect(save.mock.calls).has.length(0);
      registry.value = undefined;
      await wrapper.vm.$nextTick();
      expect(wrapper.getComponent(ConfirmDialog).vm.$.uid).eq(id);
      expect(wrapper.getComponent(ConfirmDialog).vm.shown).is.true;
      const accept = confirmation.findAll('button')[0];
      accept.element.addEventListener('click', (event) => event.preventDefault(), {once: true});
      await accept.trigger('click');
      expect(save.mock.calls).deep.eq([[{type: 'initialCards', responses: [
        {type: 'card', cards: [CardName.POLYPHEMOS]}, {type: 'card', cards: []},
      ]}]]);
    } finally {
      wrapper.unmount();
    }
  });
});
