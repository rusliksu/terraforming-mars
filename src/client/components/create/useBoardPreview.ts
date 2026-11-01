import {onBeforeUnmount, reactive} from 'vue';
import {paths} from '@/common/app/paths';
import type {BoardPreviewModel, BoardPreviewRequest} from '@/common/models/BoardPreviewModel';

/** Optional read-only request owner; stale or disabled previews never reach the view. */
export function useBoardPreview() {
  const boardPreviewState = reactive<{data?: BoardPreviewModel, loading: boolean, error?: string}>({loading: false});
  let version = 0;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function loadBoardPreview(request: BoardPreviewRequest | undefined) {
    const current = ++version;
    controller?.abort();
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    boardPreviewState.data = undefined;
    boardPreviewState.error = undefined;
    boardPreviewState.loading = request !== undefined;
    if (request === undefined) {
      return;
    }
    const body = JSON.stringify(request);
    const abort = new AbortController();
    controller = abort;
    timer = setTimeout(async () => {
      try {
        const response = await fetch(paths.API_BOARD_PREVIEW, {method: 'POST', body,
          headers: {'Content-Type': 'application/json'}, signal: abort.signal});
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: BoardPreviewModel = await response.json();
        if (version === current && !abort.signal.aborted) {
          boardPreviewState.data = data;
        }
      } catch (error) {
        if (version === current && !abort.signal.aborted) {
          boardPreviewState.error = error instanceof Error ? error.message : 'Unavailable';
        }
      } finally {
        if (version === current && !abort.signal.aborted) {
          boardPreviewState.loading = false;
        }
      }
    }, 150);
  }
  onBeforeUnmount(() => loadBoardPreview(undefined));
  return {boardPreviewState, loadBoardPreview};
}
