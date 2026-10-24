import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import PaymentForm from '@/client/components/PaymentForm.vue';
import SelectProjectCardToPlay from '@/client/components/SelectProjectCardToPlay.vue';
import SourceProject from '@/client/wrybit/inputs/SelectProjectCardToPlay.vue';
import SourcePayment from '@/client/wrybit/inputs/PaymentForm.vue';
import SourceOr from '@/client/wrybit/inputs/OrOptions.vue';
import SourceAnd from '@/client/wrybit/inputs/AndOptions.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {CardName} from '@/common/cards/CardName';
import {InputResponse} from '@/common/inputs/InputResponse';
import {PlayerInputModel, SelectProjectCardToPlayModel} from '@/common/models/PlayerInputModel';

function projectInput(): SelectProjectCardToPlayModel {
  return {
    type: 'projectCard', title: 'Select a card to play', buttonLabel: 'Save',
    cards: [{name: CardName.ANTS, calculatedCost: 9}, {name: CardName.BIRDS, calculatedCost: 10}],
    paymentOptions: {heat: true}, microbes: 0, nereidMicrobes: 0, floaters: 0, anyFloaters: 0,
    lunaArchivesScience: 0, seeds: 0, graphene: 0, kuiperAsteroids: 0, auroraiData: 0, spireScience: 0,
  };
}

describe('nested permanent input controllers', () => {
  it('keeps the active project and payment while viewing the hand in the action tabs', async () => {
    const input: PlayerInputModel = {type: 'or', title: 'Take your first action', buttonLabel: 'Take action', options: [projectInput()]};
    const view = fakePlayerViewModel({waitingFor: input, cardsInHand: [{name: CardName.ANTS}, {name: CardName.BIRDS}], thisPlayer: fakePublicPlayerModel({megacredits: 50, heat: 4})});
    const registry = shallowRef<InputPresentationRegistry | undefined>({or: markRaw(SourceOr), projectCard: markRaw(SourceProject), paymentForm: markRaw(SourcePayment)});
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {global: {...globalConfig.global, components: {PlayerInputFactory}, provide: {
      [INPUT_PRESENTATIONS as symbol]: computed(() => registry.value),
    }}, props: {playerView: view, playerinput: input, onsave: save, showsave: true}});
    try {
      await flushPromises();
      await wrapper.get('input[value="Birds"]').setValue(true);
      const payment = wrapper.getComponent(PaymentForm).vm;
      payment.maxValue('heat');
      const uid = payment.$.uid;
      await wrapper.get('button[title="All cards"]').trigger('click');
      expect(wrapper.find('.hand-cards-panel').exists()).is.true;
      expect(wrapper.getComponent(PaymentForm).vm.$.uid).eq(uid);
      await wrapper.get('button[data-option-index="0"]').trigger('click');
      expect(wrapper.getComponent(PaymentForm).vm.$.uid).eq(uid);
      expect(payment.payment.heat).eq(4);
      expect(payment.payment.megacredits).eq(6);
      expect(save.mock.calls).has.length(0);
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent(PaymentForm).vm.$.uid).eq(uid);
      expect(wrapper.get<HTMLInputElement>('input[value="Birds"]').element.checked).is.true;
    } finally {
      wrapper.unmount();
    }
  });
  it('preserves and/or/project/payment instances and exact response through view changes', async () => {
    const storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
    PreferencesManager.INSTANCE.set('learner_mode', false);
    const project = projectInput();
    const input: PlayerInputModel = {type: 'and', title: 'Combined', buttonLabel: 'Save', options: [
      {type: 'or', title: 'Choose', buttonLabel: 'Save', options: [
        {type: 'card', title: 'Learner only', buttonLabel: 'Save', cards: [], min: 0, max: 1,
          showOnlyInLearnerMode: true, selectBlueCardAction: false, showOwner: false, showSelectAll: false}, project,
      ]},
    ]};
    const view = fakePlayerViewModel({waitingForId: 'nested', waitingFor: input, thisPlayer: fakePublicPlayerModel({megacredits: 50, heat: 4})});
    const registry = shallowRef<InputPresentationRegistry>();
    const save = vi.fn<(response: InputResponse) => void>();
    const wrapper = mount(PlayerInputFactory, {global: {...globalConfig.global, components: {PlayerInputFactory}, provide: {
      [INPUT_PRESENTATIONS as symbol]: computed(() => registry.value),
    }}, props: {playerView: view, playerinput: input, onsave: save, showsave: true}});
    try {
      await wrapper.get('input[value="Birds"]').setValue(true);
      await wrapper.get('[data-test=heat] .btn-max').trigger('click');
      const controller = wrapper.getComponent(SelectProjectCardToPlay).vm;
      const payment = wrapper.getComponent(PaymentForm).vm;
      const projectUid = controller.$.uid;
      const paymentUid = payment.$.uid;
      const allInputUids = wrapper.findAllComponents(PlayerInputFactory).map((component) => component.vm.$.uid);
      registry.value = {projectCard: markRaw(SourceProject), paymentForm: markRaw(SourcePayment), or: markRaw(SourceOr), and: markRaw(SourceAnd)};
      await flushPromises();
      expect(wrapper.find('.choice-block').exists()).is.true;
      expect(wrapper.getComponent(SelectProjectCardToPlay).vm.$.uid).eq(projectUid);
      expect(wrapper.getComponent(PaymentForm).vm.$.uid).eq(paymentUid);
      expect(wrapper.findAllComponents(PlayerInputFactory).map((component) => component.vm.$.uid)).deep.eq(allInputUids);
      expect(controller.cardName).eq(CardName.BIRDS);
      expect(payment.payment.heat).eq(4);
      expect(payment.payment.megacredits).eq(6);
      expect(save.mock.calls).has.length(0);
      registry.value = undefined;
      await flushPromises();
      expect(wrapper.getComponent(PaymentForm).vm.$.uid).eq(paymentUid);
      expect(wrapper.get<HTMLInputElement>('input[value="Birds"]').element.checked).is.true;
      wrapper.vm.saveData();
      expect(save.mock.calls).has.length(1);
      expect(save.mock.calls[0][0]).deep.eq({type: 'and', responses: [{type: 'or', index: 1,
        response: {type: 'projectCard', card: CardName.BIRDS, payment: payment.payment}}]});
    } finally {
      wrapper.unmount();
      FakeLocalStorage.deregister(storage);
      PreferencesManager.resetForTest();
    }
  });
});
