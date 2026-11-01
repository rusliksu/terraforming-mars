import {paths} from '@/common/app/paths';

const RETURN_TO_KEY = 'tm_login_return_to';

function isSafeReturnTo(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//');
}

/**
 * Remember where the user was going, then send them to the Discord login page.
 * The login page consumes this value after a successful OAuth callback.
 */
export function redirectToLogin(): void {
  const returnTo = window.location.pathname + window.location.search;
  if (isSafeReturnTo(returnTo)) {
    try {
      window.sessionStorage.setItem(RETURN_TO_KEY, returnTo);
    } catch (_err) {
      // Storage can be disabled in private browsing; login still works, only the return trip is lost.
    }
  }
  window.location.href = '/' + paths.LOGIN;
}

/** Reads and clears the post-login destination. Only same-origin absolute paths are accepted. */
export function consumeLoginReturnTo(): string | undefined {
  let returnTo: string | null = null;
  try {
    returnTo = window.sessionStorage.getItem(RETURN_TO_KEY);
  } catch (_err) {
    return undefined;
  }
  if (returnTo === null) {
    return undefined;
  }
  try {
    window.sessionStorage.removeItem(RETURN_TO_KEY);
  } catch (_err) {
    // Ignore storage failures; the return path is still safe to use.
  }
  return isSafeReturnTo(returnTo) ? returnTo : undefined;
}
