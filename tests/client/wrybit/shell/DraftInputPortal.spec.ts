import {mount} from '@vue/test-utils';
import {defineComponent, nextTick, provide, ref} from 'vue';
import {expect} from 'chai';
import InputHost from '@/client/wrybit/shell/InputHost.vue';
import InputPortal from '@/client/wrybit/shell/InputPortal.vue';
import {createInputHosts, INPUT_HOSTS} from '@/client/wrybit/shell/inputHosts';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import OrOptions from '@/client/components/OrOptions.vue';
import SelectInitialCards from '@/client/components/SelectInitialCards.vue';
import SelectCard from '@/client/components/SelectCard.vue';
import {PlayerInputModel, SelectCardModel} from '@/common/models/PlayerInputModel';
import {CardName} from '@/common/cards/CardName';
import {InputResponse} from '@/common/inputs/InputResponse';
import {Payment} from '@/common/inputs/Payment';
import * as titles from '@/common/inputs/SelectInitialCards';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {PaymentTester} from '@tests/client/components/PaymentTester';

describe('Partial input drafts between presentations', () => {
  let storage: FakeLocalStorage;
  beforeEach(() => {
    storage = new FakeLocalStorage();
    FakeLocalStorage.register(storage);
    PreferencesManager.resetForTest();
  });
  afterEach(() => {
    FakeLocalStorage.deregister(storage);
    PreferencesManager.resetForTest();
  });

  function fixture(input: PlayerInputModel) {
    const Classic = defineComponent({components: {InputHost}, template: '<section><InputHost /></section>'});
    const Wrybit = defineComponent({components: {InputHost}, template: '<article><InputHost /></article>'});
    const responses: Array<InputResponse> = [];
    const Root = defineComponent({
      components: {Classic, Wrybit, InputPortal},
      setup() {
        const hosts = createInputHosts();
        provide(INPUT_HOSTS, hosts);
        return {hosts, wrybit: ref(false), input, view: fakePlayerViewModel({thisPlayer: fakePublicPlayerModel({megacredits: 50, heat: 4})}), save: (out: InputResponse) => responses.push(out)};
      },
      template: '<Wrybit v-if="wrybit" /><Classic v-else /><InputPortal :target="hosts.target.value"><PlayerInputFactory :player-view="view" :playerinput="input" :onsave="save" :showsave="true" :showtitle="true" /></InputPortal>',
    });
    const container = document.createElement('div');
    document.body.append(container);
    const wrapper = mount(Root, {
      attachTo: container,
      global: {...globalConfig.global, components: {PlayerInputFactory}},
    });
    return {wrapper, container, responses};
  }

  it('keeps both nested branches and their selected card/payment before emitting their original indices', async () => {
    const pass: PlayerInputModel = {type: 'option', title: 'Pass', buttonLabel: 'Pass'};
    const {wrapper, container, responses} = fixture({
      type: 'or', title: 'Choose action', buttonLabel: 'Confirm', options: [pass, {
        type: 'or', title: 'Choose card action', buttonLabel: 'Play', options: [pass, {
          type: 'projectCard', title: 'Select a card to play', buttonLabel: 'Play',
          cards: [{name: CardName.ANTS, calculatedCost: 9}, {name: CardName.BIRDS, calculatedCost: 10}],
          paymentOptions: {heat: true},
          microbes: 0, floaters: 0, lunaArchivesScience: 0, seeds: 0, graphene: 0,
          kuiperAsteroids: 0, auroraiData: 0, spireScience: 0, nereidMicrobes: 0, anyFloaters: 0,
        }],
      }],
    });
    try {
      await nextTick();
      const outer = wrapper.getComponent(OrOptions);
      await outer.findAll('input[type="radio"]')[1].setValue(true);
      const inner = wrapper.findAllComponents(OrOptions)[1];
      await inner.findAll('input[type="radio"]')[1].setValue(true);
      const radio = wrapper.get<HTMLInputElement>('input[value="Birds"]');
      await radio.setValue(true);
      const tester = new PaymentTester(wrapper);
      await tester.clickMax('heat');
      wrapper.vm.wrybit = true;
      await nextTick();
      expect(wrapper.getComponent(OrOptions).element).eq(outer.element);
      expect(wrapper.findAllComponents(OrOptions)[1].element).eq(inner.element);
      expect(wrapper.get('article input[value="Birds"]').element).eq(radio.element);
      expect(radio.element.checked).is.true;
      tester.expectPayment({heat: 4, megacredits: 6});
      expect(responses).is.empty;
      const save = outer.findAll('button').find((button) => button.text() === 'Play');
      if (save === undefined) {
        throw new Error('Missing outer save button');
      }
      await save.trigger('click');
      expect(responses).deep.eq([{
        type: 'or', index: 1, response: {
          type: 'or', index: 1, response: {type: 'projectCard', card: CardName.BIRDS, payment: Payment.of({heat: 4, megacredits: 6})},
        },
      }]);
    } finally {
      wrapper.unmount();
      container.remove();
    }
  });

  it('keeps an incomplete initial selection and finishes it after moving the same form', async () => {
    const cards = (title: string, names: Array<CardName>, max: number, min = 1): SelectCardModel => ({
      type: 'card', title, buttonLabel: 'Select', cards: names.map((name) => ({name})), min, max,
      showOnlyInLearnerMode: false, selectBlueCardAction: false, showOwner: false, showSelectAll: false,
    });
    const {wrapper, container, responses} = fixture({
      type: 'initialCards', title: 'Initial selection', buttonLabel: 'Start', options: [
        cards(titles.SELECT_CORPORATION_TITLE, [CardName.ECOLINE], 1),
        cards(titles.SELECT_PRELUDE_TITLE, [CardName.ALLIED_BANK, CardName.SUPPLY_DROP], 2, 2),
        cards(titles.SELECT_PROJECTS_TITLE, [CardName.ANTS, CardName.BIRDS], 2),
      ],
    });
    try {
      await nextTick();
      const form = wrapper.getComponent(SelectInitialCards);
      const corpInput = form.findAllComponents(SelectCard)[0].get<HTMLInputElement>('input');
      await corpInput.setValue(true);
      await form.findAllComponents(SelectCard)[1].findAll('input')[0].setValue(true);
      expect(form.vm.valid).is.false;
      wrapper.vm.wrybit = true;
      await nextTick();
      expect(wrapper.getComponent(SelectInitialCards).element).eq(form.element);
      expect(corpInput.element.checked).is.true;
      expect(form.vm.selectedCorporations).deep.eq([CardName.ECOLINE]);
      expect(form.vm.selectedPreludes).deep.eq([CardName.ALLIED_BANK]);
      expect(form.vm.valid).is.false;
      expect(responses).is.empty;
      await form.findAllComponents(SelectCard)[1].findAll('input')[1].setValue(true);
      await form.findAllComponents(SelectCard)[2].get('input').setValue(true);
      expect(form.vm.valid).is.true;
      await form.getComponent({name: 'AppButton'}).trigger('click');
      expect(responses).deep.eq([{type: 'initialCards', responses: [
        {type: 'card', cards: [CardName.ECOLINE]},
        {type: 'card', cards: [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]},
        {type: 'card', cards: [CardName.ANTS]},
      ]}]);
    } finally {
      wrapper.unmount();
      container.remove();
    }
  });
});
