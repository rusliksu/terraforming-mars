import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import NativeAnd from '@/client/components/AndOptions.vue';
import NativeOr from '@/client/components/OrOptions.vue';
import NativeColony from '@/client/components/SelectColony.vue';
import SourceAnd from '@/client/wrybit/inputs/AndOptions.vue';
import SourceOr from '@/client/wrybit/inputs/OrOptions.vue';
import SourceColony from '@/client/wrybit/inputs/SelectColony.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {ColonyName} from '@/common/colonies/ColonyName';
import type {AndOptionsModel} from '@/common/models/PlayerInputModel';
import type {ColonyModel} from '@/common/models/ColonyModel';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';

describe('source trade over permanent native composite inputs', () => {
  const luna: ColonyModel = {name: ColonyName.LUNA, colonies: ['red'], isActive: true, trackPosition: 4, visitor: undefined};
  const titan: ColonyModel = {name: ColonyName.TITAN, colonies: [], isActive: false, trackPosition: 2, visitor: undefined};
  function form(title = 'Trade with a colony tile') {
    const playerinput: AndOptionsModel = {type: 'and', title, buttonLabel: 'Trade', options: [
      {type: 'or', title: 'Pay trade fee', buttonLabel: 'Pay', options: [
        {type: 'option', title: 'Use a special card', buttonLabel: 'Pay'},
        {type: 'option', title: {message: 'Pay ${0} titanium', data: [{type: LogMessageDataType.RAW_STRING, value: '2'}]}, buttonLabel: 'Pay'},
        {type: 'option', title: {message: 'Pay ${0} M€', data: [{type: LogMessageDataType.RAW_STRING, value: '8'}]}, buttonLabel: 'Pay'},
      ]},
      {type: 'colony', title: 'Select colony tile for trade', buttonLabel: 'trade', coloniesModel: [luna]},
    ]};
    const playerView = fakePlayerViewModel({game: fakeGameModel({colonies: [luna, titan]}),
      players: [fakePublicPlayerModel(), fakePublicPlayerModel({color: 'red', name: 'Colony owner'})],
      thisPlayer: {colonyTradeContext: {version: 1, remainingActionsThisTurn: 2, allOpponentsPassed: false,
        tradeAvailable: true, tradeOffset: 1, tradeBonusMC: 0,
        payments: [{resource: 'energy', amount: 2, available: false}, {resource: 'titanium', amount: 2, available: true},
          {resource: 'megacredits', amount: 8, available: true}], stockColonies: [], ordinaryProduction: true,
        additionalPaymentMechanism: true, nextGenerationTradeAccess: 'normal', gameCanContinue: true}}});
    const views: InputPresentationRegistry = {and: markRaw(SourceAnd), or: markRaw(SourceOr), colony: markRaw(SourceColony)};
    const registry = shallowRef<InputPresentationRegistry | undefined>(views);
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {props: {playerView, playerinput, onsave: save, showsave: true},
      global: {...globalConfig.global, components: {PlayerInputFactory}, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    return {wrapper, playerView, playerinput, registry, views, save};
  }

  it('keeps native fee indices and colony selection after refresh and classic return', async () => {
    const {wrapper, playerView, playerinput, registry, views, save} = form();
    try {
      await flushPromises();
      expect(wrapper.find('.trade-colony').exists()).is.true;
      const and = wrapper.getComponent(NativeAnd).vm;
      const or = wrapper.getComponent(NativeOr).vm;
      const colony = wrapper.getComponent(NativeColony).vm;
      const owners = [and.$.uid, or.$.uid, colony.$.uid];
      expect(and.canSave()).is.false;
      expect(wrapper.get('[data-test="trade-fee-off-energy"]').text()).contains('2');
      expect(wrapper.get<HTMLButtonElement>('[data-test="trade-offer-Titan"]').element.disabled).is.true;
      expect(wrapper.get<HTMLButtonElement>('[data-test="trade-submit"]').element.disabled).is.true;
      await wrapper.get('[data-test="trade-fee-option-1"]').trigger('click');
      await wrapper.get('[data-test="trade-offer-Luna"]').trigger('click');
      await wrapper.setProps({playerinput: JSON.parse(JSON.stringify(playerinput)), playerView: {...playerView,
        game: {...playerView.game, colonies: [{...luna, trackPosition: 6}, titan]}}});
      expect(wrapper.get('.trade-colony__receipt').text()).contains('17');
      expect(wrapper.get('.trade-colony__receipt').text()).contains('Colony owner');
      expect(save.mock.calls).has.length(0);
      registry.value = undefined;
      await flushPromises();
      expect(or.selectedIdx).eq(1);
      expect(colony.selectedColony).eq(ColonyName.LUNA);
      registry.value = views;
      await flushPromises();
      expect([and.$.uid, or.$.uid, colony.$.uid]).deep.eq(owners);
      expect(wrapper.get('[data-test="trade-fee-option-1"]').attributes('aria-pressed')).eq('true');
      expect(wrapper.get('[data-test="trade-offer-Luna"]').attributes('aria-pressed')).eq('true');
      await wrapper.get('[data-test="trade-submit"]').trigger('click');
      await flushPromises();
      expect(save.mock.calls).deep.eq([[{type: 'and', responses: [
        {type: 'or', index: 1, response: {type: 'option'}}, {type: 'colony', colonyName: ColonyName.LUNA},
      ]}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps unrelated composites in their generic source forms', async () => {
    const {wrapper} = form('Choose two unrelated bonuses');
    try {
      await flushPromises();
      expect(wrapper.find('.trade-colony').exists()).is.false;
      expect(wrapper.find('[data-test="colony-choice-Luna"]').exists()).is.true;
    } finally {
      wrapper.unmount();
    }
  });
});
