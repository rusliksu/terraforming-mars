import {SpaceBonus} from './SpaceBonus';
import {SpaceType} from './SpaceType';
import {
  MAX_SIMPLE_BOARD_NAME_LENGTH,
  SIMPLE_BOARD_SPACE_TYPES,
  SimpleBoardType,
  SimpleCustomBoardDefinition,
  SimpleCustomSpaceDef,
  VenusReservedSpot,
  simpleBoardLayout,
} from './SimpleCustomBoardDefinition';
import {bytesToBase64url, base64urlToBytes} from '../utils/base64url';

// Distinct from Mars's `TMB3…` prefix (customBoardCodec.ts) so the two families of code are never
// ambiguous, and the board type is still encoded inside so a Moon and a Venus code both start the
// same way.
const PREFIX = 'TMBS1';

export class SimpleBoardCodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimpleBoardCodecError';
  }
}

// The JSON shape actually put on the wire. Short keys, and bonus/space type are carried as their
// raw enum values (SpaceType is a string enum, SpaceBonus a numeric one) -- these boards are tiny
// (29-37 cells), so plain JSON + base64url keeps this codec far shorter than Mars's bit-packed
// one, at the cost of a longer code string. Position (x, y) is NOT carried per-cell -- the shape
// is fixed per board type (`simpleBoardLayout`), so `s` is just the ordered list of
// (type, bonus, reserved?, voided?) tuples matching that layout. `reserved`/`voided` are plain
// JSON array elements, not fixed-length TS tuple slots, so codes from before either existed still
// decode fine -- `wire.s[i]` just has fewer elements, read defensively below. A `voided` tuple's
// `reserved` slot round-trips through JSON as `null` (an array can't have a genuine "hole" in the
// middle), not `undefined` -- decode treats both the same.
interface WireDefinition {
  v: 1;
  t: SimpleBoardType;
  n: string;
  s: Array<[SpaceType, Array<number>, VenusReservedSpot?, boolean?]>;
}

export function encodeSimpleBoard(def: SimpleCustomBoardDefinition): string {
  validateSimpleBoard(def);
  const wire: WireDefinition = {
    v: 1,
    t: def.boardType,
    n: def.name,
    s: def.spaces.map((space): [SpaceType, Array<number>, VenusReservedSpot?, boolean?] => {
      if (space.voided === true) {
        return [space.spaceType, space.bonus, space.reserved, true];
      }
      return space.reserved === undefined ? [space.spaceType, space.bonus] : [space.spaceType, space.bonus, space.reserved];
    }),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(wire));
  return PREFIX + bytesToBase64url(bytes);
}

export function decodeSimpleBoard(code: string): SimpleCustomBoardDefinition {
  if (!code.startsWith(PREFIX)) {
    throw new SimpleBoardCodecError('Not a recognized simple-board code');
  }
  let wire: WireDefinition;
  try {
    const bytes = base64urlToBytes(code.slice(PREFIX.length));
    wire = JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    throw new SimpleBoardCodecError('Malformed simple-board code');
  }
  if (wire === null || typeof wire !== 'object') {
    throw new SimpleBoardCodecError('Malformed simple-board code');
  }
  if (wire.v !== 1) {
    throw new SimpleBoardCodecError(`Unsupported simple-board code version ${wire.v}`);
  }
  if (wire.t !== 'moon' && wire.t !== 'venusPhase2') {
    throw new SimpleBoardCodecError(`Unknown board type '${wire.t}'`);
  }
  if (typeof wire.n !== 'string' || !Array.isArray(wire.s)) {
    throw new SimpleBoardCodecError('Malformed simple-board code');
  }
  const layout = simpleBoardLayout(wire.t);
  const def: SimpleCustomBoardDefinition = {
    version: 1,
    boardType: wire.t,
    name: wire.n,
    spaces: wire.s.map(([spaceType, bonus, reserved, voided], i): SimpleCustomSpaceDef => ({
      x: layout[i]?.x ?? -1,
      y: layout[i]?.y ?? -1,
      spaceType,
      bonus,
      ...(reserved === undefined || reserved === null ? {} : {reserved}),
      ...(voided === true ? {voided: true} : {}),
    })),
  };
  validateSimpleBoard(def);
  return def;
}

export function validateSimpleBoard(def: SimpleCustomBoardDefinition): void {
  if (def.name.length === 0 || def.name.length > MAX_SIMPLE_BOARD_NAME_LENGTH) {
    throw new SimpleBoardCodecError(`Name must be 1-${MAX_SIMPLE_BOARD_NAME_LENGTH} characters`);
  }
  const layout = simpleBoardLayout(def.boardType);
  if (def.spaces.length !== layout.length) {
    throw new SimpleBoardCodecError(`Expected ${layout.length} spaces, got ${def.spaces.length}`);
  }
  const allowedTypes: ReadonlyArray<SpaceType> = SIMPLE_BOARD_SPACE_TYPES[def.boardType];
  let stratopolisCount = 0;
  let maxwellBaseCount = 0;
  let voidedCount = 0;
  for (let i = 0; i < def.spaces.length; i++) {
    const space = def.spaces[i];
    const expected = layout[i];
    if (space.x !== expected.x || space.y !== expected.y) {
      throw new SimpleBoardCodecError(
        `Space ${i} position mismatch: expected (${expected.x},${expected.y}), got (${space.x},${space.y})`);
    }
    if (!allowedTypes.includes(space.spaceType)) {
      throw new SimpleBoardCodecError(`Space type '${space.spaceType}' is not valid for board type '${def.boardType}'`);
    }
    if (space.voided === true) {
      voidedCount++;
      if (space.reserved !== undefined) {
        throw new SimpleBoardCodecError(`Space ${i} can't be both voided and reserved`);
      }
    }
    if (space.reserved !== undefined) {
      if (def.boardType !== 'venusPhase2') {
        throw new SimpleBoardCodecError(`'reserved' is not valid for board type '${def.boardType}'`);
      }
      if (space.reserved !== 'stratopolis' && space.reserved !== 'maxwellBase') {
        throw new SimpleBoardCodecError(`Invalid reserved spot '${space.reserved}'`);
      }
      if (space.reserved === 'stratopolis') {
        stratopolisCount++;
      }
      if (space.reserved === 'maxwellBase') {
        maxwellBaseCount++;
      }
    }
    for (const bonus of space.bonus) {
      if (typeof bonus !== 'number' || SpaceBonus[bonus] === undefined) {
        throw new SimpleBoardCodecError(`Invalid space bonus '${bonus}'`);
      }
    }
  }
  if (stratopolisCount > 1) {
    throw new SimpleBoardCodecError('At most one space may be reserved for Stratopolis');
  }
  if (maxwellBaseCount > 1) {
    throw new SimpleBoardCodecError('At most one space may be reserved for Maxwell Base');
  }
  if (voidedCount >= def.spaces.length) {
    throw new SimpleBoardCodecError('At least one space must remain (the whole board can\'t be voided)');
  }
}
