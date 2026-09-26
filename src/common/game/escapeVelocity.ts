import {EscapeVelocityOptions} from './NewGameConfig';
import {normalizeEscapeVelocityOptions} from './EscapeVelocityOptions';

/** Normalizes supplied settings with the same bounds used by game creation and deserialization. */
export function sanitizeEscapeVelocityOptions(options: {[K in keyof EscapeVelocityOptions]?: unknown}): EscapeVelocityOptions {
  const normalized = normalizeEscapeVelocityOptions(options);
  if (normalized === undefined) {
    throw new Error('Escape Velocity options are required');
  }
  return normalized;
}
