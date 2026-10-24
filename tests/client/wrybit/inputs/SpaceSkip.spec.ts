import {flushPromises, mount} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import NativeWaiting from '@/client/components/WaitingFor.vue';
import NativeFactory from '@/client/components/PlayerInputFactory.vue';
import NativeOr from '@/client/components/OrOptions.vue';
import NativeSpace from '@/client/components/SelectSpace.vue';
import SourceWaiting from '@/client/wrybit/inputs/WaitingForTabs.vue';
import SourceOr from '@/client/wrybit/inputs/OrOptions.vue';
import SourceSpace from '@/client/wrybit/inputs/SelectSpace.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import type {OrOptionsModel} from '@/common/models/PlayerInputModel';

describe('source placement with a native skip option', () => {
  const views = {waitingFor: markRaw(SourceWaiting), or: markRaw(SourceOr), space: markRaw(SourceSpace)};
  function form() {
    const input: OrOptionsModel = {type: 'or', title: 'Place any final greenery from plants', buttonLabel: 'Confirm', options: [
      {type: 'option', title: "Don't place a greenery", buttonLabel: 'Save'},
      {type: 'space', title: 'Select space for greenery tile', buttonLabel: 'Save', spaces: ['03']},
    ]};
    const registry = shallowRef<InputPresentationRegistry>();
    const actor = fakePublicPlayerModel();
    const view = fakePlayerViewModel({waitingFor: input, thisPlayer: actor, players: [actor]});
    const wrapper = mount(NativeWaiting, {attachTo: document.body, props: {playerView: view, waitingfor: input},
      global: {...globalConfig.global, components: {PlayerInputFactory: NativeFactory},
        provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    const save = vi.spyOn(wrapper.vm, 'onsave').mockImplementation(() => {});
    return {wrapper, registry, save};
  }

  it('keeps a classic skip draft, retains the space controller through hand viewing and submits the original skip index', async () => {
    const {wrapper, registry, save} = form();
    try {
      expect(wrapper.getComponent(NativeOr).vm.selectedIdx).eq(0);
      registry.value = views;
      await flushPromises();
      expect(wrapper.getComponent(NativeOr).vm.selectedIdx).eq(0);
      expect(wrapper.findAll('.or-tab-panel')).has.length(1);
      await wrapper.get('.space-choose-option').trigger('click');
      const uid = wrapper.getComponent(NativeSpace).vm.$.uid;
      await wrapper.get('button[title="All cards"]').trigger('click');
      await wrapper.get('[data-input-tab]').trigger('click');
      expect(wrapper.getComponent(NativeSpace).vm.$.uid).eq(uid);
      await wrapper.get('.space-skip-option').trigger('click');
      await flushPromises();
      expect(save.mock.calls).deep.eq([[{type: 'or', index: 0, response: {type: 'option'}}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('does not publish a queued choice after classic return or native owner disposal', async () => {
    const {wrapper, registry, save} = form();
    try {
      registry.value = views;
      await flushPromises();
      const owner = wrapper.getComponent(NativeOr).vm;
      const skip = owner.displayedOptions[0];
      const pending = owner.presentationBinding.chooseAndSave(skip);
      registry.value = undefined;
      await pending;
      expect(save.mock.calls).has.length(0);
      registry.value = views;
      await flushPromises();
      const disposed = owner.presentationBinding.chooseAndSave(skip);
      wrapper.unmount();
      await disposed;
      expect(save.mock.calls).has.length(0);
    } finally {
      if (wrapper.exists()) {
        wrapper.unmount();
      }
    }
  });
});
