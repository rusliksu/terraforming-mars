import type {ErrorDiagnosticContext} from './SentryReporter';

type CaptureError = (error: unknown, context: ErrorDiagnosticContext) => void;
type LogError = (...args: unknown[]) => void;
export type UncaughtExceptionHandler = (
  error: Error,
  origin: 'uncaughtException' | 'unhandledRejection',
) => void;

export interface ProcessListenerTarget {
  on(event: 'uncaughtException', listener: UncaughtExceptionHandler): unknown;
}

export function createUncaughtExceptionHandler(
  captureError: CaptureError,
  logError: LogError = console.error,
): UncaughtExceptionHandler {
  return (error) => {
    logError('UNCAUGHT EXCEPTION', error);
    try {
      captureError(error, {boundary: 'process'});
    } catch (_error) {
      // Sentry is best-effort; preserve the existing local error path.
    }
  };
}

export function registerUncaughtExceptionHandler(
  captureError: CaptureError,
  target: ProcessListenerTarget = process,
  logError: LogError = console.error,
): void {
  target.on('uncaughtException', createUncaughtExceptionHandler(captureError, logError));
}
