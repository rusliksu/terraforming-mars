export type PlayerId = `p${string}`;
/** Occupies a colony tile's slot once a player has sold their colony there (see the Colony
 * Sale card): the slot stays filled - it can't be built on again - but doesn't belong to any
 * real player, so it's excluded from every player-identity check against `Colony.colonies`. */
export const NEUTRAL_COLONY_OWNER: PlayerId = 'pNEUTRAL';
export type GameId = `g${string}`;
export type SpectatorId = `s${string}`;
export type ParticipantId = PlayerId | SpectatorId;
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type TwoDigits = `${Digit}${Digit}`;
type ThreeDigits = `${Digit}${Digit}${Digit}`;
// Two-digit ids cover the official Mars boards and off-Mars colony spaces; three-digit ids
// (>= '100') are reserved for custom boards, which may be larger than the standard 61 spaces.
// `m`-prefixed ids are The Moon.
export type SpaceId = `${TwoDigits}` | `${ThreeDigits}` | `m${TwoDigits}`;
export type Named<T> = {name: T};

export function isPlayerId(object: any): object is PlayerId {
  return object?.charAt?.(0) === 'p';
}

export function isGameId(object: string): object is GameId {
  return object?.charAt?.(0) === 'g';
}

export function isSpectatorId(object: string): object is SpectatorId {
  return object?.charAt?.(0) === 's';
}

export function isSpaceId(object: string): object is SpaceId {
  return /^(m[0-9]{2}|[0-9]{2,3})$/.test(object);
}

export function safeCast<T>(object: any, tester: (object: any) => object is T) {
  if (tester(object)) {
    return object;
  }
  throw new Error('failed cast: ' + tester.name);
}

/**
 * Very similar to `any` but only contains primitives, arrays of primitives, or dictionaries of primitives.
 *
 * An object of this type is guaranteed safe to serialize and deserialize.
 */
export type JSONValue =
    | undefined
    | string
    | number
    | boolean
    | JSONObject
    | Array<JSONValue>;

export type JSONObject = { [x: string]: JSONValue };

