import {flushPromises, mount} from '@vue/test-utils';
import {computed, defineComponent, markRaw, provide} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import NativeFactory from '@/client/components/PlayerInputFactory.vue';
import NativeSpace from '@/client/components/SelectSpace.vue';
import SourceSpace from '@/client/wrybit/inputs/SelectSpace.vue';
import GameBoardView from '@/client/wrybit/visuals/GameBoardView.vue';
import {INPUT_PRESENTATIONS} from '@/client/wrybit/inputs/presentation';
import {fakeGameModel, fakePlayerViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';

describe('placement zoom with a single native board selection', () => {
  function form(board: 'mars' | 'venus' = 'mars') {
    PreferencesManager.resetForTest();
    PreferencesManager.INSTANCE.set('hide_tile_confirmation', false);
    const save = vi.fn();
    const Root = defineComponent({components: {GameBoardView, NativeFactory}, setup() {
      provide(INPUT_PRESENTATIONS, computed(() => ({space: markRaw(SourceSpace)})));
      const game = board === 'mars' ? fakeGameModel({spaces: [{id: '03'}]}) :
        fakeGameModel({venusPhase2: {spaces: [{id: '298'}]}, gameOptions: {expansions: {venusPhase2: true}}});
      return {save, view: fakePlayerViewModel({game}),
        input: {type: 'space', title: 'Select a space', buttonLabel: 'Place', spaces: [board === 'mars' ? '03' : '298']}};
    }, template: '<GameBoardView :game="view.game" :players="view.players" tileView="hide"/><NativeFactory :playerView="view" :playerinput="input" :onsave="save" :showsave="true" :showtitle="true"/>'});
    const wrapper = mount(Root, {attachTo: document.body, global: {...globalConfig.global,
      stubs: {Board: {template: '<div class="board-cont"><div id="main_board"><button class="board-space-selectable" data_space_id="03">03</button></div></div>'},
        VenusSurfaceBoard: {template: '<svg><foreignObject><div id="venus_board"><button class="board-space-selectable" data_space_id="298">298</button></div></foreignObject></svg>'}}}});
    return {wrapper, save};
  }
  it('moves the same board and offered space into zoom and back, then submits one native confirmation', async () => {
    const {wrapper, save} = form();
    try {
      await flushPromises();
      const original = document.querySelector<HTMLButtonElement>('#main_board [data_space_id="03"]')!;
      const uid = wrapper.getComponent(NativeSpace).vm.$.uid;
      await wrapper.get('.select-space-zoom-button').trigger('click');
      await flushPromises();
      expect(document.querySelectorAll('#main_board')).has.length(1);
      expect(document.querySelector('.board-zoom-content #main_board [data_space_id="03"]')).eq(original);
      original.click();
      await flushPromises();
      document.querySelector<HTMLButtonElement>('.space-confirm-button--no')!.click();
      await flushPromises();
      expect(save.mock.calls).has.length(0);
      document.querySelector<HTMLButtonElement>('.board-zoom-close')!.click();
      await flushPromises();
      expect(document.querySelector('.board-zoom-backdrop')).eq(null);
      expect(document.querySelector('#main_board [data_space_id="03"]')).eq(original);
      expect(wrapper.getComponent(NativeSpace).vm.$.uid).eq(uid);
      await wrapper.get('.select-space-zoom-button').trigger('click');
      await flushPromises();
      original.click();
      await flushPromises();
      document.querySelector<HTMLButtonElement>('.space-confirm-button--yes')!.click();
      await flushPromises();
      expect(document.querySelector('.board-zoom-backdrop')).eq(null);
      expect(save.mock.calls).deep.eq([[{type: 'space', spaceId: '03'}]]);
    } finally {
      wrapper.unmount();
      PreferencesManager.resetForTest();
    }
  });

  it('applies the confirmation opt-out to the next selection and closes zoom before the native reply', async () => {
    const {wrapper, save} = form();
    try {
      await flushPromises();
      await wrapper.get('.select-space-zoom-button').trigger('click');
      await flushPromises();
      const tile = document.querySelector<HTMLButtonElement>('#main_board [data_space_id="03"]')!;
      tile.click();
      await flushPromises();
      document.querySelector<HTMLInputElement>('.space-confirm-skip input')!.click();
      await flushPromises();
      expect(save.mock.calls).has.length(0);
      expect(document.querySelector('.space-confirm')).not.eq(null);
      document.querySelector<HTMLButtonElement>('.space-confirm-button--no')!.click();
      await flushPromises();
      tile.click();
      await flushPromises();
      expect(document.querySelector('.space-confirm')).eq(null);
      expect(document.querySelector('.board-zoom-backdrop')).eq(null);
      expect(save.mock.calls).deep.eq([[{type: 'space', spaceId: '03'}]]);
    } finally {
      wrapper.unmount();
      PreferencesManager.resetForTest();
    }
  });

  it('enlarges our SVG Venus surface without replacing its offered cell', async () => {
    const {wrapper, save} = form('venus');
    try {
      await flushPromises();
      const original = document.querySelector('#venus_board');
      await wrapper.get('.select-space-zoom-button').trigger('click');
      await flushPromises();
      expect(document.querySelector('.board-zoom-content #venus_board')).eq(original);
      expect(document.querySelectorAll('#venus_board')).has.length(1);
      expect(save.mock.calls).has.length(0);
    } finally {
      wrapper.unmount();
      PreferencesManager.resetForTest();
    }
  });
});
