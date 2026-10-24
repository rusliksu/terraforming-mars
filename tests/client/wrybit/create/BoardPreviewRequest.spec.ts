import {mount, flushPromises} from '@vue/test-utils';
import {defineComponent, h} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import {useBoardPreview} from '@/client/components/create/useBoardPreview';
import {BoardName} from '@/common/boards/BoardName';
import {DEFAULT_EXPANSIONS} from '@/common/cards/GameModule';
import type {BoardPreviewModel} from '@/common/models/BoardPreviewModel';

const request = {board: BoardName.THARSIS, seed: 0.25, shuffleMapOption: false, expansions: {...DEFAULT_EXPANSIONS}, includedCards: []};
const Harness = defineComponent({setup() {
  return useBoardPreview();
}, render() {
  return h('div');
}});

describe('optional board preview request owner', () => {
  it('ignores late responses after option changes, disabling and unmounting', async () => {
    vi.useFakeTimers();
    const responses: Array<(value: Response) => void> = [];
    const fetch = vi.fn(() => new Promise<Response>((resolve) => responses.push(resolve)));
    vi.stubGlobal('fetch', fetch);
    const wrapper = mount(Harness);
    const resolve = async (index: number, boardName: BoardName) => {
      const model: BoardPreviewModel = {boardName, spaces: [], randomExample: false};
      responses[index]({ok: true, json: async () => model} as Response);
      await flushPromises();
    };
    try {
      wrapper.vm.loadBoardPreview(undefined);
      await vi.advanceTimersByTimeAsync(250);
      expect(fetch.mock.calls).has.length(0);
      wrapper.vm.loadBoardPreview(request);
      await vi.advanceTimersByTimeAsync(250);
      wrapper.vm.loadBoardPreview({...request, board: BoardName.HELLAS});
      await vi.advanceTimersByTimeAsync(250);
      await resolve(0, BoardName.THARSIS);
      expect(wrapper.vm.boardPreviewState.data).eq(undefined);
      await resolve(1, BoardName.HELLAS);
      expect(wrapper.vm.boardPreviewState.data?.boardName).eq(BoardName.HELLAS);
      expect(wrapper.vm.boardPreviewState.loading).is.false;
      wrapper.vm.loadBoardPreview(request);
      await vi.advanceTimersByTimeAsync(250);
      wrapper.vm.loadBoardPreview(undefined);
      await resolve(2, BoardName.THARSIS);
      expect(wrapper.vm.boardPreviewState.data).eq(undefined);
      wrapper.vm.loadBoardPreview(request);
      await vi.advanceTimersByTimeAsync(250);
      wrapper.unmount();
      await resolve(3, BoardName.THARSIS);
      expect(wrapper.vm.boardPreviewState.data).eq(undefined);
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('debounces edits and reports a failed request without stale geometry', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue({ok: false, status: 400});
    vi.stubGlobal('fetch', fetch);
    const wrapper = mount(Harness);
    try {
      wrapper.vm.loadBoardPreview(request);
      wrapper.vm.loadBoardPreview({...request, board: BoardName.ELYSIUM});
      await vi.advanceTimersByTimeAsync(250);
      expect(fetch.mock.calls).has.length(1);
      expect(JSON.parse(fetch.mock.calls[0][1].body).board).eq(BoardName.ELYSIUM);
      expect(wrapper.vm.boardPreviewState.data).eq(undefined);
      expect(wrapper.vm.boardPreviewState.error).eq('HTTP 400');
      expect(wrapper.vm.boardPreviewState.loading).is.false;
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
