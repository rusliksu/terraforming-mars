import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import SelectPlayer from '@/client/wrybit/inputs/SelectPlayer.vue';
import SelectGlobalEvent from '@/client/wrybit/inputs/SelectGlobalEvent.vue';
import SelectClaimedUndergroundToken from '@/client/wrybit/inputs/SelectClaimedUndergroundToken.vue';
import DeltaProjectInput from '@/client/wrybit/inputs/DeltaProjectInput.vue';
import ShiftAresGlobalParameters from '@/client/wrybit/inputs/ShiftAresGlobalParameters.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {PlayerInputModel} from '@/common/models/PlayerInputModel';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';

describe('expansion choices with source views and our responses', () => {
  it('preserves our Ares thresholds, offered hazards and numeric deltas', async () => {
    const save = vi.fn();
    const registry = shallowRef<InputPresentationRegistry | undefined>({aresGlobalParameters: markRaw(ShiftAresGlobalParameters)});
    const wrapper = mount(PlayerInputFactory, {props: {playerView: fakePlayerViewModel(), onsave: save, showsave: true,
      playerinput: {type: 'aresGlobalParameters', title: 'Hazards', buttonLabel: 'Save', aresData: {includeHazards: true, milestoneResults: [], hazardData: {
        erosionOceanCount: {threshold: 3, available: true}, removeDustStormsOceanCount: {threshold: 6, available: true},
        severeErosionTemperature: {threshold: -4, available: true}, severeDustStormOxygen: {threshold: 5, available: false},
      }}}}, global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    try {
      expect(wrapper.find('input[name=oxygenDelta]').exists()).is.false;
      await wrapper.get('input[name=lowOceanDelta][value="1"]').setValue(true);
      await wrapper.get('input[name=highOceanDelta][value="-1"]').setValue(true);
      await wrapper.get('input[name=temperatureDelta][value="1"]').setValue(true);
      expect(wrapper.text()).contains('-2 °C');
      registry.value = undefined;
      await wrapper.vm.$nextTick();
      expect(wrapper.get<HTMLInputElement>('input[name=temperatureDelta][value="1"]').element.checked).is.true;
      expect(wrapper.vm.saveData()).eq('saved');
      expect(save.mock.calls).deep.eq([[{type: 'aresGlobalParameters', response: {lowOceanDelta: 1, highOceanDelta: -1, temperatureDelta: 1, oxygenDelta: 0}}]]);
    } finally {
      wrapper.unmount();
    }
  });
  it('keeps player, global event, token indices and sparse Delta steps through view changes', async () => {
    const views: InputPresentationRegistry = {player: markRaw(SelectPlayer), globalEvent: markRaw(SelectGlobalEvent),
      claimedUndergroundToken: markRaw(SelectClaimedUndergroundToken), deltaProject: markRaw(DeltaProjectInput)};
    const registry = shallowRef<InputPresentationRegistry | undefined>(views);
    const playerinput: PlayerInputModel = {type: 'and', title: 'Choices', buttonLabel: 'Save', options: [
      {type: 'player', title: 'Choose player', buttonLabel: 'Save', players: ['blue', 'red']},
      {type: 'globalEvent', title: 'Choose event', buttonLabel: 'Save', globalEventNames: [GlobalEventName.GLOBAL_DUST_STORM, GlobalEventName.SPONSORED_PROJECTS]},
      {type: 'claimedUndergroundToken', title: 'Choose token', buttonLabel: 'Save', min: 1, max: 1,
        tokens: [{token: 'sciencetag', shelter: false, active: true}, {token: 'planttag', shelter: true, active: false}]},
      {type: 'deltaProject', title: 'Delta', buttonLabel: 'Advance', validSteps: [1, 4]},
    ]};
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {props: {playerView: fakePlayerViewModel({players: [fakePublicPlayerModel(), fakePublicPlayerModel({name: 'Other', color: 'red'})]}),
      playerinput, onsave: save, showsave: true},
    global: {...globalConfig.global, components: {PlayerInputFactory}, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    try {
      await flushPromises();
      expect(wrapper.vm.canSave()).is.false;
      await wrapper.get('.player-option input[value=red]').setValue(true);
      await wrapper.getComponent(SelectGlobalEvent).findAll('input')[1].setValue(true);
      await wrapper.getComponent(SelectClaimedUndergroundToken).findAll('input')[1].setValue(true);
      expect(wrapper.vm.canSave()).is.true;
      await wrapper.getComponent(DeltaProjectInput).get('select').setValue('4');
      expect(wrapper.getComponent(DeltaProjectInput).findAll('option').map((option) => option.element.value)).deep.eq(['1', '4']);
      registry.value = undefined;
      await wrapper.vm.$nextTick();
      expect(wrapper.findAll<HTMLInputElement>('input[type=checkbox]').filter((input) => input.element.checked)).has.length(1);
      expect(wrapper.get<HTMLSelectElement>('select').element.value).eq('4');
      registry.value = views;
      await wrapper.vm.$nextTick();
      expect(wrapper.get('.player-option--selected').text()).contains('Other');
      expect(save.mock.calls).has.length(0);
      expect(wrapper.vm.saveData()).eq('saved');
      expect(save.mock.calls).deep.eq([[{type: 'and', responses: [
        {type: 'player', player: 'red'}, {type: 'globalEvent', globalEventName: GlobalEventName.SPONSORED_PROJECTS},
        {type: 'claimedUndergroundToken', selected: [1]}, {type: 'deltaProject', amount: 4},
      ]}]]);
    } finally {
      wrapper.unmount();
    }
  });
});
