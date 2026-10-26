import {flushPromises, mount} from '@vue/test-utils';
import {computed, defineComponent, markRaw, provide, ref} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import SelectSpace from '@/client/components/SelectSpace.vue';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';
import SourceSpace from '@/client/wrybit/inputs/SelectSpace.vue';
import SpaceConfirmPopover from '@/client/wrybit/visuals/SpaceConfirmPopover.vue';
import InputHost from '@/client/wrybit/shell/InputHost.vue';
import InputPortal from '@/client/wrybit/shell/InputPortal.vue';
import {createInputHosts, INPUT_HOSTS} from '@/client/wrybit/shell/inputHosts';
import {INPUT_PRESENTATIONS} from '@/client/wrybit/inputs/presentation';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('source placement confirmation with our board controller', () => {
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

  it('rebinds the selected space across modes, cancels and submits only one current confirmation', async () => {
    const save = vi.fn();
    const board = '<div id="main_board"><button class="board-space-selectable" data_space_id="03">03</button><button class="board-space-selectable" data_space_id="99">99</button></div>';
    const Root = defineComponent({components: {InputHost, InputPortal}, setup() {
      const hosts = createInputHosts();
      const source = ref(false);
      provide(INPUT_HOSTS, hosts);
      provide(INPUT_PRESENTATIONS, computed(() => source.value ? {space: markRaw(SourceSpace)} : undefined));
      return {hosts, source, save, view: fakePlayerViewModel(), input: {type: 'space', title: 'Select a space', buttonLabel: 'Place', spaces: ['03']}};
    }, template: '<article v-if="source">' + board + '<InputHost/></article><section v-else>' + board + '<InputHost/></section>' +
      '<InputPortal :target="hosts.target.value"><PlayerInputFactory :playerView="view" :playerinput="input" :onsave="save" :showsave="true" :showtitle="true"/></InputPortal>'});
    const container = document.createElement('div');
    document.body.append(container);
    const wrapper = mount(Root, {attachTo: container, global: {...globalConfig.global, components: {PlayerInputFactory}}});
    try {
      await flushPromises();
      const oldTile = wrapper.get<HTMLButtonElement>('[data_space_id="03"]').element;
      oldTile.click();
      await flushPromises();
      const controller = wrapper.getComponent(SelectSpace).vm.$.uid;
      expect(wrapper.getComponent(ConfirmDialog).vm.shown).is.true;
      wrapper.vm.source = true;
      await flushPromises();
      const sourceTile = wrapper.get<HTMLButtonElement>('[data_space_id="03"]').element;
      expect(wrapper.getComponent(SelectSpace).vm.$.uid).eq(controller);
      expect(wrapper.getComponent(ConfirmDialog).vm.shown).is.false;
      expect(wrapper.getComponent(SpaceConfirmPopover).props('anchor')).eq(sourceTile);
      expect(oldTile.onclick).eq(null);
      expect(wrapper.get<HTMLButtonElement>('[data_space_id="99"]').element.onclick).eq(null);
      document.body.querySelector<HTMLButtonElement>('.space-confirm-button--no')!.click();
      await flushPromises();
      expect(wrapper.getComponent(SpaceConfirmPopover).props('anchor')).is.undefined;
      expect(save.mock.calls).has.length(0);
      sourceTile.click();
      await flushPromises();
      const oldAccept = wrapper.getComponent(SelectSpace).vm.presentationBinding.accept;
      wrapper.vm.source = false;
      await flushPromises();
      expect(wrapper.getComponent(ConfirmDialog).vm.shown).is.true;
      oldAccept();
      expect(save.mock.calls).has.length(0);
      wrapper.vm.source = true;
      await flushPromises();
      document.body.querySelector<HTMLButtonElement>('.space-confirm-button--yes')!.click();
      await flushPromises();
      oldTile.click();
      sourceTile.click();
      expect(save.mock.calls).deep.eq([[{type: 'space', spaceId: '03'}]]);
    } finally {
      wrapper.unmount();
      container.remove();
    }
  });
});
