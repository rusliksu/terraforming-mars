import {mount} from '@vue/test-utils';
import {defineComponent, nextTick, provide, ref} from 'vue';
import {expect} from 'chai';
import InputHost from '@/client/wrybit/shell/InputHost.vue';
import InputPortal from '@/client/wrybit/shell/InputPortal.vue';
import {createInputHosts, INPUT_HOSTS} from '@/client/wrybit/shell/inputHosts';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';
import {PlayerInputModel} from '@/common/models/PlayerInputModel';
import {InputResponse} from '@/common/inputs/InputResponse';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
import {FakeLocalStorage} from '@tests/client/components/FakeLocalStorage';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Board input across presentation replacement', () => {
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
    const board = '<div id="main_board"><button class="board-space-selectable" data_space_id="03">03</button><button class="board-space-selectable" data_space_id="99">99</button></div>';
    const Classic = defineComponent({components: {InputHost}, template: '<section>' + board + '<InputHost /></section>'});
    const Wrybit = defineComponent({components: {InputHost}, template: '<article>' + board + '<InputHost /></article>'});
    const responses: Array<InputResponse> = [];
    const Root = defineComponent({
      components: {Classic, Wrybit, InputPortal},
      setup() {
        const hosts = createInputHosts();
        provide(INPUT_HOSTS, hosts);
        return {hosts, wrybit: ref(false), input: ref(input), view: fakePlayerViewModel(), save: (out: InputResponse) => responses.push(out)};
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

  it('keeps a pending confirmation on the selected space and removes old board handlers', async () => {
    const {wrapper, container, responses} = fixture({type: 'space', title: 'Select a space', buttonLabel: 'Place', spaces: ['03']});
    try {
      await nextTick();
      const oldTile = wrapper.get<HTMLButtonElement>('[data_space_id="03"]').element;
      oldTile.click();
      await nextTick();
      expect(wrapper.getComponent(ConfirmDialog).vm.shown).is.true;
      expect(responses).is.empty;
      wrapper.vm.wrybit = true;
      await nextTick();
      await nextTick();
      const newTile = wrapper.get<HTMLButtonElement>('article [data_space_id="03"]').element;
      expect(newTile).not.eq(oldTile);
      expect(oldTile.onclick).eq(null);
      expect(wrapper.get<HTMLButtonElement>('[data_space_id="99"]').element.onclick).eq(null);
      expect(responses).is.empty;
      const button = wrapper.getComponent(ConfirmDialog).get<HTMLButtonElement>('button');
      button.element.addEventListener('click', (event) => event.preventDefault(), {once: true});
      await button.trigger('click');
      expect(responses).deep.eq([{type: 'space', spaceId: '03'}]);
      newTile.click();
      oldTile.click();
      expect(responses).has.length(1);
    } finally {
      wrapper.unmount();
      container.remove();
    }
  });

  it('keeps confirmation for the selected greenery option after a cloned refresh and board replacement', async () => {
    const input: PlayerInputModel = {
      type: 'or', title: 'Choose action', buttonLabel: 'Take action', options: [
        {type: 'option', title: 'Pass', buttonLabel: 'Pass'},
        {type: 'space', title: 'Convert 8 plants into greenery', buttonLabel: 'Place', spaces: ['03']},
      ],
    };
    const {wrapper, container, responses} = fixture(input);
    try {
      await nextTick();
      await wrapper.findAll('input[type="radio"]')[1].setValue(true);
      await nextTick();
      const oldTile = wrapper.get<HTMLButtonElement>('[data_space_id="03"]').element;
      wrapper.vm.input = JSON.parse(JSON.stringify(input));
      wrapper.vm.wrybit = true;
      await nextTick();
      await nextTick();
      oldTile.click();
      const newTile = wrapper.get<HTMLButtonElement>('article [data_space_id="03"]').element;
      newTile.click();
      await nextTick();
      expect(responses).is.empty;
      expect(wrapper.getComponent(ConfirmDialog).vm.shown).is.true;
      const button = wrapper.getComponent(ConfirmDialog).get<HTMLButtonElement>('button');
      button.element.addEventListener('click', (event) => event.preventDefault(), {once: true});
      await button.trigger('click');
      expect(responses).deep.eq([{type: 'or', index: 1, response: {type: 'space', spaceId: '03'}}]);
    } finally {
      wrapper.unmount();
      container.remove();
    }
  });

  it('rebinds quick greenery to the new board with the original option index', async () => {
    PreferencesManager.INSTANCE.set('hide_tile_confirmation', true);
    const {wrapper, container, responses} = fixture({
      type: 'or', title: 'Choose action', buttonLabel: 'Take action', options: [
        {type: 'option', title: 'Pass', buttonLabel: 'Pass'},
        {type: 'space', title: 'Convert 8 plants into greenery', buttonLabel: 'Place', spaces: ['03']},
      ],
    });
    try {
      await nextTick();
      await nextTick();
      const oldTile = wrapper.get<HTMLButtonElement>('[data_space_id="03"]').element;
      wrapper.vm.wrybit = true;
      await nextTick();
      await nextTick();
      oldTile.click();
      expect(responses).is.empty;
      wrapper.get<HTMLButtonElement>('[data_space_id="99"]').element.click();
      expect(responses).is.empty;
      wrapper.get<HTMLButtonElement>('article [data_space_id="03"]').element.click();
      expect(responses).deep.eq([{type: 'or', index: 1, response: {type: 'space', spaceId: '03'}}]);
    } finally {
      wrapper.unmount();
      container.remove();
    }
  });
});
