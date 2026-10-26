import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive} from 'vue';
import {
  applyFetchedPlayerView,
  gameShell,
  restoreGameShellAppState,
  setGameShellEnabledForTest,
  subscribeGameShellAppState,
} from '@/client/shell';
import type {GameShellAppState} from '@/client/shell';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import {CardName} from '@/common/cards/CardName';
import {fakePlayerViewModel} from '../components/testHelpers';

function mountShellHost() {
  const Host = defineComponent({
    setup() {
      const state = reactive(restoreGameShellAppState(true));
      let unsubscribe: (() => void) | undefined;
      onMounted(() => {
        unsubscribe = subscribeGameShellAppState(state, () => {});
      });
      onBeforeUnmount(() => unsubscribe?.());
      return () => h('div', {class: 'shell-host'}, `${state.playerView?.runId ?? 'none'}:${state.playerkey}`);
    },
  });
  return mount(Host);
}

describe('GameShell App bridge', () => {
  beforeEach(() => {
    gameShell.stop();
    gameShell.reset();
  });

  afterEach(() => {
    setGameShellEnabledForTest(undefined);
    gameShell.stop();
    gameShell.reset();
  });

  it('keeps the legacy playerkey flow when the flag is off', () => {
    setGameShellEnabledForTest(false);
    const state: GameShellAppState = restoreGameShellAppState(true);
    expect(state).deep.eq({playerView: undefined, playerkey: 0, playerHome: false});

    const view = fakePlayerViewModel();
    applyFetchedPlayerView(state, view);

    expect(state.playerView).eq(view);
    expect(state.playerkey).eq(1);
    expect(gameShell.getStatus()).eq('stopped');
    expect(gameShell.getConfirmedView()).eq(undefined);
    expect(subscribeGameShellAppState(state, () => {})).eq(undefined);
  });

  it('restores the confirmed view across an App remount when the flag is on', () => {
    setGameShellEnabledForTest(true);
    const first = restoreGameShellAppState(true);
    expect(first.playerHome).eq(false);
    const updates: Array<PlayerViewModel> = [];
    const unsubscribe = subscribeGameShellAppState(first, (view) => updates.push(view));
    expect(unsubscribe).not.eq(undefined);

    const view = fakePlayerViewModel();
    applyFetchedPlayerView(first, view);
    expect(first.playerView).eq(view);
    expect(first.playerkey).eq(1);
    expect(updates).deep.eq([view]);
    expect(gameShell.getConfirmedView()).eq(view);
    unsubscribe?.();

    // Simulate App unmount/remount: the data() restore reads the singleton.
    const remounted = restoreGameShellAppState(true);
    expect(remounted.playerView).eq(view);
    expect(remounted.playerkey).eq(1);
    expect(remounted.playerHome).eq(true);

    const remountedUpdates: Array<PlayerViewModel> = [];
    const unsubscribeRemounted = subscribeGameShellAppState(remounted, (next) => remountedUpdates.push(next));
    const nextView = fakePlayerViewModel();
    gameShell.setConfirmedView(nextView);
    expect(remounted.playerView).eq(nextView);
    expect(remounted.playerkey).eq(2);
    expect(remountedUpdates).deep.eq([nextView]);
    unsubscribeRemounted?.();
  });

  it('keeps the confirmed view when a Vue host remounts', async () => {
    setGameShellEnabledForTest(true);
    const view = fakePlayerViewModel({runId: 'view-1'});
    gameShell.setConfirmedView(view, 3);

    const first = mountShellHost();
    expect(first.text()).eq('view-1:3');
    first.unmount();

    const second = mountShellHost();
    expect(second.text()).eq('view-1:3');

    const nextView = fakePlayerViewModel({runId: 'view-2'});
    gameShell.setConfirmedView(nextView);
    await nextTick();
    expect(second.text()).eq('view-2:4');
    second.unmount();
  });

  it('does not persist the authorized view or private cards', () => {
    setGameShellEnabledForTest(true);
    const view = fakePlayerViewModel({cardsInHand: [{name: CardName.BIRDS}]});
    expect(JSON.stringify(view)).contains(CardName.BIRDS);

    const storage = window.localStorage;
    const originalSetItem = storage.setItem;
    const writes: Array<{key: string; value: string}> = [];
    window.Storage.prototype.setItem = (key: string, value: string) => {
      writes.push({key, value});
      originalSetItem.call(storage, key, value);
    };

    try {
      const state = restoreGameShellAppState(true);
      const unsubscribe = subscribeGameShellAppState(state, () => {});
      applyFetchedPlayerView(state, view);
      unsubscribe?.();
    } finally {
      window.Storage.prototype.setItem = originalSetItem;
    }

    expect(writes.filter((write) => write.value.includes(CardName.BIRDS))).deep.eq([]);
    expect(writes.filter((write) => write.key.includes('playerView'))).deep.eq([]);
    for (const write of writes) {
      expect(write.value).not.contains('"cardsInHand"');
    }
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) {
        expect(storage.getItem(key) ?? '').not.contains(CardName.BIRDS);
      }
    }
  });
});
