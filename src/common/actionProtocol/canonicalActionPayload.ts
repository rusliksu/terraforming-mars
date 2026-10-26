import type {ActionRequestV1} from './ActionProtocol';

/**
 * Stable JSON used for idempotency fingerprints. The server hashes this string;
 * the client never sends the hash as authority.
 */
export function canonicalActionPayload(request: ActionRequestV1): string {
  return stableJson(request);
}

function stableJson(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Cannot canonicalize a non-finite number');
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableJson).join(',') + ']';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + stableJson(obj[key])).join(',') + '}';
  }
  throw new Error('Cannot canonicalize ' + typeof value);
}
