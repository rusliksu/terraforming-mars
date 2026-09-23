import {onScopeDispose, reactive} from 'vue';
import {ReplayFrame, ReplayIndex} from '@/common/models/ReplayModel';
import {paths} from '@/common/app/paths';

export function useReplay(spectatorId: string) {
  const state = reactive({index: undefined as ReplayIndex | undefined, frame: undefined as ReplayFrame | undefined,
    position: 0, playing: false, loading: true, error: false, speed: 1});
  const cache = new Map<number, ReplayFrame>();
  let request: AbortController | undefined;
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function pause() {
    state.playing = false;
    clearTimeout(timer);
  }

  function schedule() {
    clearTimeout(timer);
    if (state.position >= (state.index?.saveIds.length ?? 0) - 1) {
      pause();
    } else if (state.playing && !state.loading && !state.error) {
      timer = setTimeout(() => void loadFrame(state.position + 1), 1000 / state.speed);
    }
  }

  function beginRequest() {
    request?.abort();
    request = new AbortController();
    state.loading = true;
    state.error = false;
    state.frame = undefined;
    return {signal: request.signal, current: ++revision};
  }

  async function read<T>(signal: AbortSignal, saveId?: number): Promise<T> {
    const query = new URLSearchParams({id: spectatorId});
    if (saveId !== undefined) {
      query.set('saveId', String(saveId));
    }
    const response = await fetch('/' + paths.API_REPLAY + '?' + query, {signal, cache: 'no-store'});
    if (!response.ok) {
      throw new Error('Replay unavailable');
    }
    return response.json();
  }

  function fail(current: number) {
    if (current !== revision) {
      return;
    }
    state.loading = false;
    state.error = true;
    pause();
  }

  async function loadFrame(position: number) {
    const ids = state.index?.saveIds;
    if (ids === undefined || ids.length === 0) {
      return;
    }
    state.position = Math.max(0, Math.min(ids.length - 1, Math.round(position)));
    const saveId = ids[state.position];
    const {signal, current} = beginRequest();
    try {
      const frame = cache.get(saveId) ?? await read<ReplayFrame>(signal, saveId);
      if (current !== revision) {
        return;
      }
      if (frame.saveId !== saveId) {
        throw new Error('Unexpected replay frame');
      }
      cache.delete(saveId);
      cache.set(saveId, frame);
      if (cache.size > 8) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) {
          cache.delete(oldest);
        }
      }
      state.frame = frame;
      state.loading = false;
      schedule();
    } catch {
      fail(current);
    }
  }

  async function initialize() {
    pause();
    cache.clear();
    state.index = undefined;
    const {signal, current} = beginRequest();
    try {
      const index = await read<ReplayIndex>(signal);
      if (current !== revision) {
        return;
      }
      state.index = index;
      state.loading = false;
      await loadFrame(0);
    } catch {
      fail(current);
    }
  }

  async function seek(position: number) {
    pause();
    await loadFrame(position);
  }

  function play() {
    if (state.frame === undefined || state.loading || state.error) {
      return;
    }
    state.playing = true;
    schedule();
  }

  function setSpeed(speed: number) {
    if ([0.5, 1, 2, 4].includes(speed)) {
      state.speed = speed;
      schedule();
    }
  }

  onScopeDispose(() => {
    pause();
    revision++;
    request?.abort();
    cache.clear();
  });
  return {state, initialize, seek, play, pause, setSpeed};
}
