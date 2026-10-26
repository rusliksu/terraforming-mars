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

function withoutPromptId(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const source = value as Record<string, unknown>;
  if (!('promptId' in source)) {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (key !== 'promptId') {
      output[key] = source[key];
    }
  }
  return output;
}

export function promptFingerprintFromWaitingFor(waitingFor: unknown): string {
  // promptId is derived metadata stamped by the view model builder; the fingerprint
  // must describe the prompt itself so the same prompt hashes the same through every
  // model-building path (raw toModel, simulation host, action replay).
  return `prompt:${stableHash(withoutPromptId(waitingFor ?? {}))}`;
}
