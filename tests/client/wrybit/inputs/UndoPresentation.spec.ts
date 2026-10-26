import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import NativeWaiting from '@/client/components/WaitingFor.vue';
import NativeFactory from '@/client/components/PlayerInputFactory.vue';
import SourceWaiting from '@/client/wrybit/inputs/WaitingForTabs.vue';
import SourceOr from '@/client/wrybit/inputs/OrOptions.vue';
import SourceOption from '@/client/wrybit/inputs/SelectOption.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {Phase} from '@/common/Phase';
import type {PlayerInputModel} from '@/common/models/PlayerInputModel';

describe('source undo controls on our native request owner', () => {
  function form(phase: Phase, input: PlayerInputModel = {type: 'option', title: 'Choose a bonus', buttonLabel: 'Confirm'}) {
    const views = {waitingFor: markRaw(SourceWaiting), or: markRaw(SourceOr), option: markRaw(SourceOption)};
    const registry = shallowRef<InputPresentationRegistry | undefined>(views);
    const actor = fakePublicPlayerModel({isActive: true});
    const game = fakeGameModel({phase});
    game.gameOptions.undoStepOption = true;
    const view = fakePlayerViewModel({id: 'p-undo-proof', waitingFor: input, thisPlayer: actor, players: [actor],
      game, canStepBack: true, canUndoResearchPurchase: true});
    const wrapper = mount(NativeWaiting, {attachTo: document.body, props: {playerView: view, waitingfor: input},
      global: {...globalConfig.global, components: {PlayerInputFactory: NativeFactory},
        provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    const request = vi.spyOn(wrapper.vm, 'fetchPlayerInput').mockImplementation(() => {});
    return {wrapper, registry, request, views};
  }

  it('uses the exact native action/step routes and keeps classic undo selection through hand and mode switches', async () => {
    const {wrapper, registry, request, views} = form(Phase.ACTION);
    try {
      await flushPromises();
      expect(wrapper.findAll('.cancel-action-button')).has.length(2);
      expect(wrapper.find('.wf-undo-controls').isVisible()).is.false;
      await wrapper.get('[data-undo-mode="action"]').trigger('click');
      await wrapper.get('[data-undo-mode="step"]').trigger('click');
      expect(request.mock.calls).deep.eq([
        ['reset?id=p-undo-proof', {method: 'GET'}],
        ['reset?id=p-undo-proof&mode=step', {method: 'GET'}],
      ]);
      await wrapper.get('button[title="All cards"]').trigger('click');
      expect(wrapper.get('[data-undo-mode="action"]').isVisible()).is.false;
      registry.value = undefined;
      await flushPromises();
      await wrapper.get('input[value="step"]').setValue(true);
      registry.value = views;
      await flushPromises();
      registry.value = undefined;
      await flushPromises();
      expect((wrapper.get('input[value="step"]').element as HTMLInputElement).checked).is.true;
    } finally {
      wrapper.unmount();
    }
  });

  it('uses native research undo eligibility and suppresses extra undo buttons at the main action menu', async () => {
    const {wrapper, request} = form(Phase.RESEARCH);
    try {
      await flushPromises();
      expect(wrapper.get('[data-undo-mode="research"]').text()).eq('Undo card purchase (experimental)');
      expect(wrapper.find('[data-undo-mode="action"]').exists()).is.false;
      await wrapper.get('[data-undo-mode="research"]').trigger('click');
      expect(request.mock.calls).deep.eq([['reset?id=p-undo-proof&mode=research', {method: 'GET'}]]);
      const input: PlayerInputModel = {type: 'or', title: 'Take your first action', buttonLabel: 'Take action', options: [
        {type: 'option', title: 'Pass', buttonLabel: 'Pass'},
      ]};
      const view = {...wrapper.vm.playerView, game: {...wrapper.vm.playerView.game, phase: Phase.ACTION}};
      await wrapper.setProps({playerView: view, waitingfor: input});
      await flushPromises();
      expect(wrapper.find('.cancel-action-button').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
