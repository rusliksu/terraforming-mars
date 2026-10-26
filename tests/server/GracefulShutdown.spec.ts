import {expect} from 'chai';
import {drain} from '../../src/server/server/gracefulShutdown';

describe('graceful shutdown', () => {
  it('stops accepting connections, waits for the close and flushes saves', async () => {
    let closeCallback: (() => void) | undefined;
    let idleClosed = false;
    let flushed = false;
    const server = {
      close(callback: () => void) {
        closeCallback = callback;
      },
      closeIdleConnections() {
        idleClosed = true;
      },
      closeAllConnections() {},
    };
    const loader = {
      flush: async () => {
        flushed = true;
      },
    };

    const promise = drain(server, loader, 1000);
    expect(idleClosed).is.true;
    expect(flushed).is.false;

    closeCallback!();
    await promise;
    expect(flushed).is.true;
  });

  it('forces the remaining connections after the timeout', async () => {
    let closeCallback: (() => void) | undefined;
    let forced = false;
    const server = {
      close(callback: () => void) {
        closeCallback = callback;
      },
      closeIdleConnections() {},
      closeAllConnections() {
        forced = true;
        closeCallback?.();
      },
    };

    const promise = drain(server, {flush: async () => {}}, 5);
    await promise;

    expect(forced).is.true;
  });
});
