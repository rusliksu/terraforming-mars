import {EscapeVelocityOptions} from './NewGameConfig';
import {normalizeEscapeVelocityOptions} from './EscapeVelocityOptions';

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
}

/**
 * Returns true when any of `options` is a negative number, or a string that parses to one.
 */
export function hasNegativeEscapeVelocityOption(options: {[K in keyof EscapeVelocityOptions]?: unknown}): boolean {
  const values = [options.thresholdMinutes, options.bonusSectionsPerAction, options.penaltyPeriodMinutes, options.penaltyVPPerPeriod];
  return values.some((value) => toNumber(value) < 0);
}

/** Normalizes supplied settings with the same bounds used by game creation and deserialization. */
export function sanitizeEscapeVelocityOptions(options: {[K in keyof EscapeVelocityOptions]?: unknown}): EscapeVelocityOptions {
  const normalized = normalizeEscapeVelocityOptions(options);
  if (normalized === undefined) {
    throw new Error('Escape Velocity options are required');
  }
  return normalized;
}
