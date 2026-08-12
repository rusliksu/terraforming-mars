import {expect} from 'chai';
import {
  createUncaughtExceptionHandler,
  ProcessListenerTarget,
  registerUncaughtExceptionHandler,
  UncaughtExceptionHandler,
} from '../../../src/server/server/SentryProcessBoundary';

describe('Sentry process boundary', () => {
  it('registers only the uncaught-exception callback and preserves capture and logging', () => {
    const registrations: Array<{event: string, listener: UncaughtExceptionHandler}> = [];
    const target: ProcessListenerTarget = {
      on: (event, listener) => {
        registrations.push({event, listener});
        return target;
      },
    };
    const error = new Error('process failure');
    const sequence: Array<
      {kind: 'log', args: unknown[]} |
      {kind: 'capture', error: unknown, context: unknown}
    > = [];

    registerUncaughtExceptionHandler(
      (capturedError, context) => sequence.push({kind: 'capture', error: capturedError, context}),
      target,
      (...args) => sequence.push({kind: 'log', args}),
    );
    expect(registrations.map((registration) => registration.event)).deep.eq(['uncaughtException']);

    registrations[0].listener(error, 'uncaughtException');

    expect(sequence).deep.eq([
      {kind: 'log', args: ['UNCAUGHT EXCEPTION', error]},
      {kind: 'capture', error, context: {boundary: 'process'}},
    ]);
  });

  it('keeps the existing local log when reporter capture unexpectedly throws', () => {
    const error = new Error('capture failure');
    const logs: unknown[][] = [];
    const handler = createUncaughtExceptionHandler(
      () => {
        throw new Error('synthetic reporter failure');
      },
      (...args) => logs.push(args),
    );

    expect(() => handler(error, 'uncaughtException')).not.throw();
    expect(logs).deep.eq([['UNCAUGHT EXCEPTION', error]]);
  });
});
