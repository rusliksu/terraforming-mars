// Dependency-free base64url (no padding) encode/decode, shared by the various opaque share-code
// codecs (map boards, custom cards) so the bit-fiddly alphabet math lives in exactly one place.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function bytesToBase64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += B64[(triple >> 18) & 63] + B64[(triple >> 12) & 63];
    if (i + 1 < bytes.length) {
      out += B64[(triple >> 6) & 63];
    }
    if (i + 2 < bytes.length) {
      out += B64[triple & 63];
    }
  }
  return out;
}

/** Throws a plain `Error` (callers with a domain-specific error type should catch and rewrap) on invalid input. */
export function base64urlToBytes(s: string): Uint8Array {
  const bytes: Array<number> = [];
  for (let i = 0; i < s.length; i += 4) {
    const c0 = B64.indexOf(s[i]);
    const c1 = B64.indexOf(s[i + 1]);
    const c2 = i + 2 < s.length ? B64.indexOf(s[i + 2]) : -1;
    const c3 = i + 3 < s.length ? B64.indexOf(s[i + 3]) : -1;
    if (c0 < 0 || c1 < 0) {
      throw new Error('Invalid character in base64url string');
    }
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) {
      bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    }
    if (c3 >= 0) {
      bytes.push(((c2 & 3) << 6) | c3);
    }
  }
  return Uint8Array.from(bytes);
}
