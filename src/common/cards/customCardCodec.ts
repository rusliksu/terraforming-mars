import {CustomCardDefinition} from './CustomCardDefinition';
import {bytesToBase64url, base64urlToBytes} from '../utils/base64url';

const PREFIX = 'TMC1';

export class CustomCardCodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomCardCodecError';
  }
}

/**
 * Unlike customBoardCodec.ts's hand-packed binary format, a CustomCardDefinition contains
 * open-ended nested JSON (`behavior`, `renderData` rows) with no fixed schema -- bit-packing it
 * would mean hand-writing a serializer for every Behavior/render-node variant and re-touching it
 * every time that surface grows. This trades a longer opaque code for trivial forward
 * compatibility: new optional fields just round-trip through JSON.
 */
export function encodeCustomCard(def: CustomCardDefinition): string {
  const json = JSON.stringify(def);
  const bytes = new TextEncoder().encode(json);
  return PREFIX + bytesToBase64url(bytes);
}

export function decodeCustomCard(code: string): CustomCardDefinition {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) {
    throw new CustomCardCodecError(`Card code must start with ${PREFIX}`);
  }
  let bytes: Uint8Array;
  try {
    bytes = base64urlToBytes(trimmed.slice(PREFIX.length));
  } catch (e) {
    throw new CustomCardCodecError('Invalid character in card code');
  }
  let json: string;
  try {
    json = new TextDecoder().decode(bytes);
  } catch (e) {
    throw new CustomCardCodecError('Corrupt card code');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new CustomCardCodecError('Corrupt card code');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new CustomCardCodecError('Corrupt card code');
  }
  // Structural fields are re-checked by validateCustomCard()/the submit route's own validation --
  // this codec's job is just "did this round-trip to a plausible object at all."
  const def = parsed as Partial<CustomCardDefinition>;
  if (typeof def.cardName !== 'string' || typeof def.type !== 'string' || !Array.isArray(def.tags) ||
      !Array.isArray(def.compatibility) || typeof def.cost !== 'number' || !Array.isArray(def.requirements) ||
      typeof def.description !== 'string' || def.renderData === undefined) {
    throw new CustomCardCodecError('Card code is missing required fields');
  }
  return def as CustomCardDefinition;
}

/**
 * Non-fatal sanity checks. Returns human-readable warning strings for the maker to display;
 * an empty array means nothing looks off.
 */
export function validateCustomCard(def: CustomCardDefinition): Array<string> {
  const warnings: Array<string> = [];
  if (def.cardName.trim() === '') {
    warnings.push('The card has no name.');
  }
  if (def.renderData.rows.length === 0) {
    warnings.push('The card has no icons.');
  }
  if (def.behavior === undefined && (def.effectDescription ?? '').trim() === '') {
    warnings.push('The card has no effect and no effect description -- it cannot be approved as-is.');
  }
  if (def.compatibility.length === 0) {
    // GameCards.ts includes a registry entry when every compatibility entry is enabled --
    // vacuously true for an empty list, so this card would show up in every game with Custom
    // Cards enabled, not none. Still worth flagging: most cards should scope themselves to the
    // expansion(s) whose mechanics/tags they actually use.
    warnings.push('The card has no expansion compatibility set -- it will be available in every game with Custom Cards enabled, not scoped to a specific expansion.');
  }
  return warnings;
}
