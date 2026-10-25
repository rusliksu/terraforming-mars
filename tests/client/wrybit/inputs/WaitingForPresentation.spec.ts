import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import NativeWaiting from '@/client/components/WaitingFor.vue';
import NativeFactory from '@/client/components/PlayerInputFactory.vue';
import NativeCard from '@/client/components/SelectCard.vue';
import NativePayment from '@/client/components/PaymentForm.vue';
import NativeAmount from '@/client/components/SelectAmount.vue';
import SourceCard from '@/client/wrybit/inputs/SelectCard.vue';
import SourceOr from '@/client/wrybit/inputs/OrOptions.vue';
import SourceWaiting from '@/client/wrybit/inputs/WaitingForTabs.vue';
import SourceProject from '@/client/wrybit/inputs/SelectProjectCardToPlay.vue';
import SourcePayment from '@/client/wrybit/inputs/PaymentForm.vue';
import SourceAmount from '@/client/wrybit/inputs/SelectAmount.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {CardName} from '@/common/cards/CardName';
import {PlayerInputModel, SelectCardModel} from '@/common/models/PlayerInputModel';
import {Phase} from '@/common/Phase';
import {Resource} from '@/common/Resource';
import SourceWaitingPlayers from '@/client/wrybit/inputs/WaitingForPlayersTab.vue';

describe('source waiting-for tabs on the permanent native RPC owner', () => {
  function form(input: PlayerInputModel) {
    const views = {card: markRaw(SourceCard), or: markRaw(SourceOr), waitingFor: markRaw(SourceWaiting),
      projectCard: markRaw(SourceProject), paymentForm: markRaw(SourcePayment), amount: markRaw(SourceAmount)};
    const registry = shallowRef<InputPresentationRegistry | undefined>(views);
    const actor = fakePublicPlayerModel({megacredits: 50, heat: 4});
    const view = fakePlayerViewModel({waitingFor: input, thisPlayer: actor, players: [actor], cardsInHand: [{name: CardName.BIRDS}]});
    const wrapper = mount(NativeWaiting, {attachTo: document.body, props: {playerView: view, waitingfor: input},
      global: {...globalConfig.global, components: {PlayerInputFactory: NativeFactory},
        provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    const save = vi.spyOn(wrapper.vm, 'onsave').mockImplementation(() => {});
    return {wrapper, registry, save, views};
  }

  it('keeps a root card caption below its toolbar after a fresh player DTO without remounting its native choice', async () => {
    const input: PlayerInputModel = {type: 'or', title: 'Choose a bonus', buttonLabel: 'Confirm', options: [
      {type: 'card', title: 'Select a card to keep', buttonLabel: 'Select', cards: [{name: CardName.ANTS}], min: 1, max: 1,
        showOnlyInLearnerMode: false, selectBlueCardAction: false, showOwner: false, showSelectAll: false},
      {type: 'option', title: 'Do nothing', buttonLabel: 'Confirm'},
    ]};
    const {wrapper} = form(input);
    try {
      await flushPromises();
      await wrapper.get('label[data-card-name="Ants"] input').setValue(true);
      const uid = wrapper.getComponent(NativeCard).vm.$.uid;
      expect(wrapper.get('.or-tab-panel-intro-slot').text()).eq('Select a card to keep');
      await wrapper.setProps({playerView: JSON.parse(JSON.stringify(wrapper.vm.playerView))});
      await flushPromises();
      expect(wrapper.get('.or-tab-panel-intro-slot').text()).eq('Select a card to keep');
      expect(wrapper.getComponent(NativeCard).vm.$.uid).eq(uid);
      expect(wrapper.getComponent(NativeCard).vm.getData()).deep.eq([CardName.ANTS]);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps the native card draft and footer through hand and classic views', async () => {
    const input: SelectCardModel = {type: 'card', title: 'Select a card to keep', buttonLabel: 'Select',
      cards: [{name: CardName.ANTS}, {name: CardName.ASTEROID}], min: 1, max: 1,
      showOnlyInLearnerMode: false, selectBlueCardAction: false, showOwner: false, showSelectAll: false};
    const {wrapper, registry, save} = form(input);
    try {
      await flushPromises();
      const owner = wrapper.getComponent(NativeCard).vm;
      const uid = owner.$.uid;
      await wrapper.get('label[data-card-name="Ants"] input').setValue(true);
      expect(wrapper.find('[data-source-waiting] .or-tab-footer .select-card-actions').exists()).is.true;
      await wrapper.get('button[title="All cards"]').trigger('click');
      expect(wrapper.get('.hand-cards-panel').isVisible()).is.true;
      expect(wrapper.get('.or-tab-footer').isVisible()).is.false;
      expect(owner.getData()).deep.eq([CardName.ANTS]);
      await wrapper.get('[data-input-tab]').trigger('click');
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent(NativeCard).vm.$.uid).eq(uid);
      expect(owner.getData()).deep.eq([CardName.ANTS]);
      owner.saveData();
      expect(save.mock.calls).deep.eq([[{type: 'card', cards: [CardName.ANTS]}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps the original option index and a single outer panel for a simple choice', async () => {
    const input: PlayerInputModel = {type: 'or', title: 'Choose a bonus', buttonLabel: 'Confirm', options: [
      {type: 'option', title: 'First bonus', buttonLabel: 'Confirm first'},
      {type: 'option', title: 'Second bonus', buttonLabel: 'Confirm second'},
    ]};
    const {wrapper, save} = form(input);
    try {
      await flushPromises();
      expect(wrapper.findAll('.or-tab-panel')).has.length(1);
      await wrapper.findAll('[data-source-or] .choice-option')[1].trigger('click');
      await wrapper.get('button[title="All cards"]').trigger('click');
      await wrapper.get('[data-input-tab]').trigger('click');
      const footer = wrapper.get('[data-source-waiting] > .or-tab-panel > .or-tab-footer');
      await footer.get('button').trigger('click');
      expect(save.mock.calls).deep.eq([[{type: 'or', index: 1, response: {type: 'option'}}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('preserves the root native payment ledger through hand and repeated layout changes', async () => {
    const input: PlayerInputModel = {type: 'projectCard', title: 'Select a card to play', buttonLabel: 'Save',
      cards: [{name: CardName.ANTS, calculatedCost: 9}, {name: CardName.BIRDS, calculatedCost: 10}],
      paymentOptions: {heat: true}, microbes: 0, nereidMicrobes: 0, floaters: 0, anyFloaters: 0,
      lunaArchivesScience: 0, seeds: 0, graphene: 0, kuiperAsteroids: 0, auroraiData: 0, spireScience: 0};
    const {wrapper, registry, save, views} = form(input);
    try {
      await flushPromises();
      const list = wrapper.get('.payments_cont');
      const toolbar = list.get('.card-filter-bar').element;
      const intro = list.get('.or-tab-panel-intro-slot').element;
      expect(Boolean(toolbar.compareDocumentPosition(intro) & Node.DOCUMENT_POSITION_FOLLOWING)).is.true;
      expect(list.findAll('.or-tab-panel-intro-slot')).has.length(1);
      await wrapper.get('input[value="Birds"]').setValue(true);
      const payment = wrapper.getComponent(NativePayment).vm;
      payment.maxValue('heat');
      const uid = payment.$.uid;
      await wrapper.get('button[title="All cards"]').trigger('click');
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent(NativePayment).vm.$.uid).eq(uid);
      expect(payment.payment.heat).eq(4);
      expect(payment.payment.megacredits).eq(6);
      registry.value = views;
      await flushPromises();
      expect(wrapper.getComponent(NativePayment).vm.$.uid).eq(uid);
      const footer = wrapper.get('[data-source-waiting] > .or-tab-panel > .or-tab-footer');
      await footer.get('.payments_save button').trigger('click');
      await flushPromises();
      expect(save.mock.calls).deep.eq([[{type: 'projectCard', card: CardName.BIRDS, payment: payment.payment}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows one card explanation for a nested converter and retains its native selected amount', async () => {
    const input: PlayerInputModel = {type: 'or', title: 'Select an option for Insulation', buttonLabel: 'Confirm', options: [
      {type: 'amount', title: 'Select amount of heat production to decrease', buttonLabel: 'Decrease', min: 1, max: 4,
        maxByDefault: false, preview: {sourceCard: CardName.INSULATION,
          from: {kind: 'production', resource: Resource.HEAT, perStep: 1, before: 4},
          to: {kind: 'production', resource: Resource.MEGACREDITS, perStep: 1, before: 0}}},
      {type: 'option', title: 'Do nothing', buttonLabel: 'Confirm'},
    ]};
    const {wrapper, registry, views, save} = form(input);
    try {
      await flushPromises();
      expect(wrapper.findAll('.card-intro-name')).has.length(1);
      expect(wrapper.get('.card-intro-name').text()).eq('Insulation');
      const owner = wrapper.getComponent(NativeAmount).vm;
      const uid = owner.$.uid;
      await wrapper.get('[role=slider]').trigger('keydown', {key: 'ArrowRight'});
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent(NativeAmount).vm.$.uid).eq(uid);
      expect((wrapper.get('input[type=number]').element as HTMLInputElement).value).eq('2');
      registry.value = views;
      await flushPromises();
      expect(wrapper.findAll('.card-intro-name')).has.length(1);
      expect(wrapper.get('[role=slider]').attributes('aria-valuenow')).eq('2');
      await wrapper.get('.or-tab-footer button.btn-submit').trigger('click');
      await flushPromises();
      expect(save.mock.calls).deep.eq([[{type: 'or', index: 0, response: {type: 'amount', amount: 2}}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows only other players still drafting using our public flags', async () => {
    const actor = fakePublicPlayerModel({color: 'red', name: 'Actor', needsToDraft: false});
    const view = fakePlayerViewModel({thisPlayer: actor, game: fakeGameModel({phase: Phase.DRAFTING}), players: [actor,
      fakePublicPlayerModel({color: 'blue', name: 'Still drafting', needsToDraft: true}),
      fakePublicPlayerModel({color: 'green', name: 'Already done', needsToDraft: false}),
    ]});
    const wrapper = mount(SourceWaitingPlayers, {...globalConfig, props: {playerView: view}});
    try {
      expect(wrapper.get('[role=status]').text()).contains('Still drafting');
      expect(wrapper.text()).not.contains('Already done');
      expect(wrapper.text()).not.contains('Actor');
      await wrapper.setProps({playerView: {...view, players: view.players.map((player) => ({...player, needsToDraft: false}))}});
      expect(wrapper.find('[role=status]').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
