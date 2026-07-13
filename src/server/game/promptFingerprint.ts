import * as crypto from 'crypto';

function normalizeStable(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeStable);
  }
  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    output[key] = normalizeStable(source[key]);
  }
  return output;
}

export function stableHash(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(normalizeStable(value))).digest('hex').slice(0, 16);
}

export function promptFingerprintFromWaitingFor(waitingFor: unknown): string {
  return `prompt:${stableHash(waitingFor ?? {})}`;
}
