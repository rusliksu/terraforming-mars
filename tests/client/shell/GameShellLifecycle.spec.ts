import {expect} from 'chai';
import {
  gameShell,
  GameShellService,
  setGameShellEnabledForTest,
} from '@/client/shell';
import type {GameShellWorkerMessage, GameShellWorkerPort, PendingIntent} from '@/client/shell';
import {fakePlayerViewModel} from '../components/testHelpers';

class MockWorkerPort implements GameShellWorkerPort {
  public startCalls = 0;
  public stopCalls = 0;
  public readonly sent: Array<PendingIntent> = [];
  private readonly listeners = new Set<(message: GameShellWorkerMessage) => void>();

  public start(): void {
    this.startCalls++;
  }

  public stop(): void {
    this.stopCalls++;
  }

  public send(intent: Readonly<PendingIntent>): void {
    this.sent.push({actionId: intent.actionId, baseRevision: intent.baseRevision});
  }

  public subscribe(listener: (message: GameShellWorkerMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(message: GameShellWorkerMessage): void {
    for (const listener of Array.from(this.listeners)) {
      listener(message);
    }
  }
}

describe('GameShellService lifecycle', () => {
  afterEach(() => {
    setGameShellEnabledForTest(undefined);
    gameShell.stop();
    gameShell.reset();
  });

  it('moves between stopped and running idempotently', () => {
    const shell = new GameShellService();
    const statuses: Array<string> = [];
    shell.subscribe((snapshot) => statuses.push(snapshot.status));

    expect(shell.getStatus()).eq('stopped');
    shell.start();
    shell.start();
    expect(shell.getStatus()).eq('running');
    shell.stop();
    expect(shell.getStatus()).eq('stopped');
    expect(statuses).deep.eq(['running', 'stopped']);
  });

  it('accepts a confirmed view from a mock Worker port', () => {
    const shell = new GameShellService();
    const port = new MockWorkerPort();
    shell.start(port);
    expect(port.startCalls).eq(1);

    const view = fakePlayerViewModel();
    port.emit({type: 'confirmed-view', playerView: view, viewRevision: 7});

    expect(shell.getConfirmedView()).eq(view);
    expect(shell.getViewRevision()).eq(7);

    shell.stop();
    expect(port.stopCalls).eq(1);
  });

  it('queues pending intents without predicting a new confirmed view', () => {
    const shell = new GameShellService();
    const port = new MockWorkerPort();
    shell.start(port);

    const view = fakePlayerViewModel();
    shell.confirmView(view, 3);
    const revision = shell.getViewRevision();
    shell.addPendingIntent({actionId: 'action-1', baseRevision: revision});

    expect(shell.getPendingIntents()).deep.eq([{actionId: 'action-1', baseRevision: revision}]);
    expect(port.sent).deep.eq([{actionId: 'action-1', baseRevision: revision}]);
    expect(shell.getConfirmedView()).eq(view);
    expect(shell.getViewRevision()).eq(revision);
  });

  it('settles a pending intent when a confirmed view references it', () => {
    const shell = new GameShellService();
    const port = new MockWorkerPort();
    shell.start(port);
    shell.addPendingIntent({actionId: 'action-1', baseRevision: 1});
    expect(shell.getPendingIntents()).length(1);

    const view = fakePlayerViewModel();
    port.emit({
      type: 'confirmed-view',
      playerView: view,
      viewRevision: 2,
      actionId: 'action-1',
    });

    expect(shell.getPendingIntents()).deep.eq([]);
    expect(shell.getConfirmedView()).eq(view);
    expect(shell.getViewRevision()).eq(2);
  });

  it('settles a rejected intent without changing the confirmed view', () => {
    const shell = new GameShellService();
    const port = new MockWorkerPort();
    shell.start(port);
    const view = fakePlayerViewModel();
    shell.confirmView(view, 4);
    shell.addPendingIntent({actionId: 'action-1', baseRevision: 4});

    port.emit({type: 'intent-rejected', actionId: 'action-1', reason: 'stale'});

    expect(shell.getPendingIntents()).deep.eq([]);
    expect(shell.getConfirmedView()).eq(view);
    expect(shell.getViewRevision()).eq(4);
  });

  it('drops pending intents on stop but keeps the confirmed view for remounts', () => {
    const shell = new GameShellService();
    const port = new MockWorkerPort();
    shell.start(port);
    const view = fakePlayerViewModel();
    shell.confirmView(view, 5);
    shell.addPendingIntent({actionId: 'action-1', baseRevision: 5});

    shell.stop();

    expect(shell.getStatus()).eq('stopped');
    expect(shell.getPendingIntents()).deep.eq([]);
    expect(shell.getConfirmedView()).eq(view);
    expect(shell.getViewRevision()).eq(5);

    // A later remount can restart the lifecycle without losing the view.
    shell.start();
    expect(shell.getConfirmedView()).eq(view);
    expect(shell.getViewRevision()).eq(5);
  });
});
