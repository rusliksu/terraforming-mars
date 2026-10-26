import {capture, ErrorDiagnosticContext} from './SentryReporter';

export type RouteErrorCapture = (error: unknown, context: ErrorDiagnosticContext) => void;

/**
 * Reports an error that a route answered with a 500.
 *
 * Every 500 response goes through `responses.internalServerError`, including routes that catch
 * their own errors and never reach `Handler.handleError`. Reporting is best-effort: a failing
 * reporter must never change the response.
 */
export function reportRouteError(
  error: unknown,
  req: {method?: string | undefined, url?: string | undefined},
  reporter: RouteErrorCapture = capture,
): void {
  const context: ErrorDiagnosticContext = {boundary: 'request'};
  const method = req.method?.trim().toUpperCase();
  if (method !== undefined && method !== '') {
    context.method = method;
  }
  const route = requestRouteOf(req.url);
  if (route !== undefined) {
    context.route = route;
  }
  try {
    reporter(error, context);
  } catch (_reportingError) {
    // Reporting is best-effort and must never replace the request error.
  }
}

/** The path a request was routed to, without its query string. */
function requestRouteOf(url: string | undefined): string | undefined {
  if (url === undefined || url === '') {
    return undefined;
  }
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch (_error) {
    return undefined;
  }
}
