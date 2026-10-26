import {expect} from 'chai';
import type {PlayerViewModel} from '../../../src/common/models/PlayerModel';
import {
  BROWSER_ENGINE_V2_FLAG,
  GameShellService,
  isBrowserEngineV2Enabled,
} from '../../../src/client/shell/GameShellService';

function view(id = 'p1'): PlayerViewModel {
  return {id} as unknown as PlayerViewModel;
}

function storageWith(value: string | null, writes: Array<string> = []) {
  return {
    getItem: (_key: string) => value,
    setItem: (key: string, next: string) => writes.push(key + '=' + next),
    writes,
  };
}

describe('GameShellService', () => {
  it('defaults the feature flag to off', () => {
    expect(isBrowserEngineV2Enabled(storageWith(null))).eq(false);
    expect(isBrowserEngineV2Enabled(storageWith('0'))).eq(false);
  });

  it('enables only the explicit v2 flag', () => {
    expect(isBrowserEngineV2Enabled(storageWith('1'))).eq(true);
    expect(isBrowserEngineV2Enabled({getItem: (key) => key === BROWSER_ENGINE_V2_FLAG ? '1' : null})).eq(true);
  });

  it('keeps confirmed view across component remounts', () => {
    const shell = new GameShellService();
    const first = view('p1');
    shell.setConfirmedView(first, 4);
    // A component remount does not reset the root service.
    expect(shell.getConfirmedView()).eq(first);
    expect(shell.getViewRevision()).eq(4);
  });

  it('notifies subscribers and unsubscribes cleanly', () => {
    const shell = new GameShellService();
    const revisions: Array<number> = [];
    const unsubscribe = shell.subscribe((snapshot) => revisions.push(snapshot.viewRevision));
    shell.setConfirmedView(view(), 1);
    unsubscribe();
    shell.setConfirmedView(view(), 2);
    expect(revisions).deep.eq([1]);
  });

  it('tracks pending intents without duplicating an actionId', () => {
    const shell = new GameShellService();
    shell.addPendingIntent({actionId: 'a', baseRevision: 1});
    shell.addPendingIntent({actionId: 'a', baseRevision: 99});
    shell.addPendingIntent({actionId: 'b', baseRevision: 2});
    expect(shell.getPendingIntents()).deep.eq([
      {actionId: 'a', baseRevision: 1},
      {actionId: 'b', baseRevision: 2},
    ]);
    shell.removePendingIntent('a');
    expect(shell.getPendingIntents()).deep.eq([{actionId: 'b', baseRevision: 2}]);
    shell.clearPendingIntents();
    expect(shell.getPendingIntents()).deep.eq([]);
  });

  it('rejects a non-monotonic view revision', () => {
    const shell = new GameShellService();
    shell.setConfirmedView(view(), 3);
    expect(() => shell.setConfirmedView(view(), 2)).to.throw('monotonic');
  });

  it('does not persist the authorized view in browser storage', () => {
    const writes: Array<string> = [];
    const storage = storageWith(null, writes);
    const shell = new GameShellService();
    shell.setConfirmedView(view(), 1);
    shell.addPendingIntent({actionId: 'a', baseRevision: 1});
    expect(writes).deep.eq([]);
    expect(storage.getItem(BROWSER_ENGINE_V2_FLAG)).eq(null);
  });
});
