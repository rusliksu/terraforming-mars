import {Units} from '../Units';
import {UncheckedBehavior} from './CustomCardDefinition';

/**
 * The bounded vocabulary of effects a public submission's `behavior` may contain -- this is the
 * actual security boundary for the Custom Card Maker's effect picker (see
 * ApiCustomCardLibrary.ts): a submission is auto-approvable specifically because its `behavior`
 * is provably drawn from this whitelist, never because it merely "looks like JSON." Anything
 * outside this vocabulary requires an admin's `set-behavior` override (ApiCustomCardLibraryReview.ts),
 * which accepts the real, unbounded `Behavior` type instead.
 *
 * Deliberately excluded (admin-only): `or`, `spend`, cross-card resource effects
 * (`addResourcesToAnyCard`/`removeResourcesFromAnyCard`/`decreaseAnyProduction`), and every
 * module-specific key (`moon`/`underworld`/`colonies`/`turmoil`).
 */
const RESOURCE_KEYS: ReadonlySet<string> = new Set(Units.keys);
const TEMPERATURE_STEPS: ReadonlySet<number> = new Set([-2, -1, 1, 2, 3]);
const OXYGEN_STEPS: ReadonlySet<number> = new Set([2, 1, -1, -2]);
const VENUS_STEPS: ReadonlySet<number> = new Set([3, 2, 1, -1]);
const PLACEMENT_TYPES: ReadonlySet<string> = new Set(['land', 'ocean', 'greenery', 'city']);
const ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'stock', 'production', 'standardResource', 'drawCard', 'global', 'city', 'greenery', 'ocean', 'addResources',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isValidUnits(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false;
  }
  return Object.entries(value).every(([key, amount]) => RESOURCE_KEYS.has(key) && isInteger(amount));
}

function isValidGlobal(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (!keys.every((k) => k === 'temperature' || k === 'oxygen' || k === 'venus')) {
    return false;
  }
  if (value.temperature !== undefined && !TEMPERATURE_STEPS.has(value.temperature as number)) {
    return false;
  }
  if (value.oxygen !== undefined && !OXYGEN_STEPS.has(value.oxygen as number)) {
    return false;
  }
  if (value.venus !== undefined && !VENUS_STEPS.has(value.venus as number)) {
    return false;
  }
  return true;
}

function isValidPlacement(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return true;
  }
  return keys.length === 1 && keys[0] === 'on' && PLACEMENT_TYPES.has(value.on as string);
}

/** Returns true iff `behavior` contains only keys/shapes the curated effect picker can produce. */
export function isCuratedBehavior(behavior: UncheckedBehavior): boolean {
  if (!isPlainObject(behavior)) {
    return false;
  }
  const keys = Object.keys(behavior);
  if (keys.length === 0) {
    return false; // an empty object isn't a meaningful effect
  }
  if (!keys.every((k) => ALLOWED_KEYS.has(k))) {
    return false;
  }
  if (behavior.stock !== undefined && !isValidUnits(behavior.stock)) {
    return false;
  }
  if (behavior.production !== undefined && !isValidUnits(behavior.production)) {
    return false;
  }
  if (behavior.standardResource !== undefined && !isInteger(behavior.standardResource)) {
    return false;
  }
  if (behavior.drawCard !== undefined && !(isInteger(behavior.drawCard) && (behavior.drawCard as number) > 0)) {
    return false;
  }
  if (behavior.global !== undefined && !isValidGlobal(behavior.global)) {
    return false;
  }
  if (behavior.city !== undefined && !isValidPlacement(behavior.city)) {
    return false;
  }
  if (behavior.greenery !== undefined && !isValidPlacement(behavior.greenery)) {
    return false;
  }
  if (behavior.ocean !== undefined && !isValidPlacement(behavior.ocean)) {
    return false;
  }
  if (behavior.addResources !== undefined && !(isInteger(behavior.addResources) && (behavior.addResources as number) > 0)) {
    return false;
  }
  return true;
}
