import {expect, vi} from 'vitest';
import {effectScope} from 'vue';
import {ReplayFrame} from '@/common/models/ReplayModel';
import {useReplay} from '@/client/components/replay/useReplay';
import {fakeGameModel} from '../testHelpers';

describe('Replay playback', () => {
  let scope = effectScope();
  let ids: Array<number>;
  const requested: Array<number> = [];

  function frame(saveId: number): ReplayFrame {
    return {saveId, view: {id: 'sreplay', runId: 'replay', color: 'neutral', thisPlayer: undefined,
      game: fakeGameModel({generation: saveId + 1}), players: []}, logs: []};
  }
  function response(data: unknown) {
    return {ok: true, json: async () => data} as Response;
  }
  const fetchFrame = async (url: Parameters<typeof fetch>[0]) => {
    const save = new URL(String(url), 'http://localhost').searchParams.get('saveId');
    if (save === null) {
      return response({name: 'Replay fixture', spectatorId: 'sreplay', saveIds: ids});
    }
    requested.push(Number(save));
    return response(frame(Number(save)));
  };

  beforeEach(() => {
    scope = effectScope();
    ids = [0, 4, 9];
    requested.length = 0;
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(fetchFrame));
  });
  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function replay() {
    return scope.run(() => useReplay('sreplay'))!;
  }

  it('starts paused, plays actual saves after the interval and stops at the last frame', async () => {
    const player = replay();
    await player.initialize();
    expect(player.state.frame?.saveId).toBe(0);
    expect(player.state.playing).toBe(false);
    expect(requested).toEqual([0]);
    player.play();
    await vi.advanceTimersByTimeAsync(999);
    expect(player.state.frame?.saveId).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(player.state.frame?.saveId).toBe(4);
    player.setSpeed(4);
    await vi.advanceTimersByTimeAsync(250);
    expect(player.state.frame?.saveId).toBe(9);
    expect(player.state.playing).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(requested).toEqual([0, 4, 9]);
  });

  it('pauses on manual seek, clamps boundaries and resumes using the selected speed', async () => {
    const player = replay();
    await player.initialize();
    player.play();
    await player.seek(1);
    expect(player.state.playing).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(player.state.frame?.saveId).toBe(4);
    await player.seek(-1);
    expect(player.state.position).toBe(0);
    player.setSpeed(0.5);
    player.play();
    await vi.advanceTimersByTimeAsync(1999);
    expect(player.state.frame?.saveId).toBe(0);
    player.pause();
    await vi.advanceTimersByTimeAsync(5000);
    expect(player.state.frame?.saveId).toBe(0);
    await player.seek(99);
    expect(player.state.frame?.saveId).toBe(9);
  });

  it('aborts a superseded request and ignores both late success and late failure', async () => {
    const player = replay();
    await player.initialize();
    for (const rejects of [false, true]) {
      let release: (value: Response) => void = () => {};
      let reject: (error: Error) => void = () => {};
      let signal: AbortSignal | undefined;
      vi.stubGlobal('fetch', vi.fn((_url, options) => {
        signal = options.signal;
        return new Promise<Response>((resolve, fail) => {
          release = resolve; reject = fail;
        });
      }));
      const pending = player.seek(1);
      expect(player.state.frame?.saveId).toBe(0);
      await player.seek(0);
      expect(signal?.aborted).toBe(true);
      if (rejects) {
        reject(new Error('late failure'));
      } else {
        release(response(frame(4)));
      }
      await pending;
      expect(player.state.frame?.saveId).toBe(0);
      expect(player.state.error).toBe(false);
    }
  });

  it('keeps the displayed frame while loading and clears it if the next frame fails', async () => {
    const player = replay();
    await player.initialize();
    let reject: (error: Error) => void = () => {};
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((_resolve, fail) => {
      reject = fail;
    })));
    player.play();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(player.state.loading).toBe(true);
    expect(player.state.frame?.saveId).toBe(0);
    reject(new Error('private server detail'));
    await vi.advanceTimersByTimeAsync(0);
    expect(player.state.error).toBe(true);
    expect(player.state.playing).toBe(false);
    expect(player.state.frame).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps only eight recently viewed frames and cancels requests when leaving', async () => {
    ids = Array.from({length: 10}, (_, i) => i * 2);
    const player = replay();
    await player.initialize();
    for (let i = 1; i < 10; i++) {
      await player.seek(i);
    }
    await player.seek(2);
    expect(requested).toHaveLength(10);
    await player.seek(0);
    expect(requested).toHaveLength(11);
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url, options) => {
      signal = options.signal;
      return new Promise<Response>(() => {});
    }));
    void player.seek(1);
    scope.stop();
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('distinguishes empty history and one frame without starting playback', async () => {
    ids = [];
    const empty = replay();
    await empty.initialize();
    expect(empty.state.index?.saveIds).toEqual([]);
    expect(empty.state.loading).toBe(false);
    expect(empty.state.error).toBe(false);
    ids = [9];
    const single = replay();
    await single.initialize();
    expect(single.state.frame?.saveId).toBe(9);
    single.play();
    expect(single.state.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
