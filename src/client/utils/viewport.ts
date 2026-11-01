/**
 * The viewport meta tag is page-global state, so every surface that needs a
 * different layout width has to share one owner list instead of saving and
 * restoring the tag on its own. Independent copies restored stale values: a
 * component that captured "width=device-width" could put it back on a page that
 * expects the classic 1260px canvas, which is how the classic player view ended
 * up laid out for a phone.
 *
 * Classic pages assert the classic viewport; responsive surfaces (mobile start
 * screen, create game form, experimental and Wrybit layouts) request the device
 * width and release it when they unmount.
 */

/** The viewport the classic desktop layout is built for (see assets/index.html). */
export const CLASSIC_VIEWPORT = 'width=1260, user-scalable=1';
/** The viewport used by responsive surfaces that lay out at the device width. */
export const DEVICE_VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover';

const META_SELECTOR = 'meta[name="viewport"]';

/** Owners currently asking for the device width. */
const deviceOwners = new Set<string>();
/** Content to restore once the last device request is released. */
let classicContent: string | undefined;

function meta(): HTMLMetaElement | null {
  return document.querySelector<HTMLMetaElement>(META_SELECTOR);
}

function write(content: string): void {
  const element = meta();
  if (element !== null && element.getAttribute('content') !== content) {
    element.setAttribute('content', content);
  }
}

/**
 * Asks for the device-width viewport. Repeat calls from the same owner are
 * idempotent, so a component may request on mount and after every re-render.
 */
export function requestDeviceViewport(owner: string): void {
  if (deviceOwners.has(owner)) {
    write(DEVICE_VIEWPORT);
    return;
  }
  if (deviceOwners.size === 0) {
    classicContent = meta()?.getAttribute('content') ?? CLASSIC_VIEWPORT;
  }
  deviceOwners.add(owner);
  write(DEVICE_VIEWPORT);
}

/** Releases one owner; the classic viewport returns with the last release. */
export function releaseDeviceViewport(owner: string): void {
  if (!deviceOwners.delete(owner)) {
    return;
  }
  if (deviceOwners.size === 0) {
    write(classicContent ?? CLASSIC_VIEWPORT);
    classicContent = undefined;
  }
}

/**
 * Puts the classic viewport back unless a responsive surface currently owns the
 * tag. Classic screens call this on mount so a leftover value can never leak
 * from a Wrybit or experimental surface into the classic layout.
 */
export function enforceClassicViewport(): void {
  if (deviceOwners.size > 0) {
    return;
  }
  write(CLASSIC_VIEWPORT);
}

/** Test helper: forget every owner and saved value. */
export function resetViewportForTest(): void {
  deviceOwners.clear();
  classicContent = undefined;
}
