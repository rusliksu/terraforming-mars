import {mount, flushPromises} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import BoardZoomModal from '@/client/wrybit/visuals/board/BoardZoomModal.vue';
import ScaledBoard from '@/client/wrybit/visuals/board/ScaledBoard.vue';
import {animateBoardZoom} from '@/client/wrybit/visuals/board/boardZoomAnimation';
import {BoardName} from '@/common/boards/BoardName';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {DEFAULT_GLOBAL_PARAMETERS} from '@/common/GlobalParameterConfig';

describe('Wrybit board zoom ownership', () => {
  it('does not hide the source board after its rendered callback unmounts the modal', async () => {
    const origin = document.createElement('div');
    const wrapper = mount(BoardZoomModal, {...globalConfig, props: {open: false, origin}, slots: {default: '<div class="board-cont"></div>'}});
    try {
      await wrapper.setProps({onRendered: () => wrapper.unmount(), open: true});
      await flushPromises();
      expect(origin.classList.contains('board-zoom-origin--hidden')).is.false;
      expect(document.querySelector('.wrybit-overlay-root .board-zoom-backdrop')).eq(null);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps tile-view controls open, scopes the overlay and closes through Escape', async () => {
    const wrapper = mount(BoardZoomModal, {...globalConfig, props: {open: true},
      slots: {default: '<div class="board-cont"><div class="tile-view-toggle"><button>Tiles</button></div></div>'}});
    try {
      await flushPromises();
      const button = document.querySelector<HTMLButtonElement>('.wrybit-overlay-root .tile-view-toggle button');
      expect(button).not.eq(null);
      button?.click();
      expect(wrapper.emitted('close')).eq(undefined);
      window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      expect(wrapper.emitted('close')).has.length(1);
      await wrapper.setProps({open: false});
      await flushPromises();
      expect(document.querySelector('.board-zoom-backdrop')).eq(null);
    } finally {
      wrapper.unmount();
    }
  });

  it('forwards our board geometry/config and leaves custom maps uncropped', async () => {
    const wrapper = mount(ScaledBoard, {...globalConfig, props: {spaces: [], boardName: BoardName.CUSTOM, planetOnly: true,
      customBoardRows: 13, globalParameters: DEFAULT_GLOBAL_PARAMETERS}});
    try {
      await flushPromises();
      expect(wrapper.classes()).not.contains('scaled-board--planet');
      expect(wrapper.getComponent({name: 'Board'}).props('customBoardRows')).eq(13);
      expect(wrapper.getComponent({name: 'Board'}).props('globalParameters')).deep.eq(DEFAULT_GLOBAL_PARAMETERS);
      const pending = wrapper.vm.measure();
      wrapper.unmount();
      await pending;
    } finally {
      wrapper.unmount();
    }
  });

  it('cancels and releases owned Web Animations when their owner aborts', async () => {
    const backdrop = document.createElement('div');
    const stage = document.createElement('div');
    const cancel = vi.fn();
    const createAnimation = () => {
      let finish: () => void = () => {};
      const animation = {finished: new Promise<unknown>((resolve) => {
        finish = () => resolve(undefined);
      }), cancel: () => {
        cancel(); finish();
      }};
      return animation as ReturnType<HTMLElement['animate']>;
    };
    stage.animate = vi.fn(createAnimation);
    backdrop.animate = vi.fn(createAnimation);
    const controller = new AbortController();
    const pending = animateBoardZoom({direction: 'open', backdrop, stage, origin: undefined, signal: controller.signal});
    controller.abort();
    await pending;
    expect(cancel.mock.calls.length).gte(2);
  });
});
