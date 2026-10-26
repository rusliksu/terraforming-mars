import {SpaceBonus} from './SpaceBonus';
import {SpaceType} from './SpaceType';
import {hexRowLayout} from './CustomBoardDefinition';

/**
 * Venus Phase 2's board is a true regular hexagon, side length 4 (4 hexes along each of the 6
 * edges) -- built with `hexRowLayout`, the exact same proven formula Mars's own boards use, rather
 * than a hand-rolled tilesPerRow array. An earlier hand-rolled attempt looked plausible but wasn't
 * actually a regular hexagon (3-hex top/bottom edges next to 4-hex diagonal edges), which visibly
 * doesn't tessellate right under `customSpacePixel`'s positioning math.
 */
export const VENUS_SURFACE_ROWS = 7;

/**
 * A user-authored Moon or Venus Phase 2 surface board. Produced by the map editor
 * (`?board=moon`/`?board=venus`), serialized into a share code by `simpleBoardCodec`, and carried
 * on `GameOptions.customMoonBoard`/`customVenusSurfaceBoard` for the life of a game.
 *
 * Unlike Mars's `CustomBoardDefinition`, the grid SHAPE is fixed per board type -- it matches
 * `MoonBoard.ts`'s/`VenusSurfaceBoard.ts`'s own hard-coded tile layout exactly (see
 * `simpleBoardLayout` below) -- only each cell's space type and bonus icons are editable. Neither
 * board supports arbitrary outline-carving, global parameters, milestones/awards, or
 * placement-bonus costs, so none of that lives here.
 */
export type SimpleBoardType = 'moon' | 'venusPhase2';

/**
 * Marks this cell as Venus Phase 2's reserved landing spot for Stratopolis/Maxwell Base --
 * mutually exclusive with `spaceType` in practice (the board-building code overrides a reserved
 * cell's type to `SpaceType.COLONY` regardless of what's painted here, the same way Mars's own
 * Noctis City reserved flag excludes a space from normal tile placement). At most one cell may
 * carry each value; absent (on every cell) falls back to the pre-existing off-grid placement.
 * Meaningless for `moon` -- Luna Trade Station/Momentum Virium aren't user-placeable.
 */
export type VenusReservedSpot = 'stratopolis' | 'maxwellBase';

export interface SimpleCustomSpaceDef {
  x: number;
  y: number;
  spaceType: SpaceType;
  bonus: Array<SpaceBonus>;
  reserved?: VenusReservedSpot;
  /**
   * Removes this cell from the board entirely -- carves the outline or punches a hole, the same
   * idea as Mars's own void tool. `spaceType`/`bonus` are ignored when this is set (whatever was
   * last painted underneath, kept only so un-voiding restores it). Mutually exclusive with
   * `reserved` -- a hex that doesn't exist can't be reserved for a card's city tile.
   */
  voided?: boolean;
}

export interface SimpleCustomBoardDefinition {
  version: 1;
  boardType: SimpleBoardType;
  /** Display name; shown in the create-game form. */
  name: string;
  /**
   * One entry per grid cell, in the same order as `simpleBoardLayout(boardType)` -- including
   * voided cells (unlike Mars's `CustomBoardDefinition`, where a void is simply absent). Kept
   * fixed-length and positional so both board builders can keep incrementing their space-id
   * counter through a void without it shifting the ids of every cell that comes after --
   * MoonBoard.vue in particular positions hexes by hand-tuned CSS keyed to that exact id, so a
   * shifted id would silently stop matching any rule.
   */
  spaces: Array<SimpleCustomSpaceDef>;
}

export const MAX_SIMPLE_BOARD_NAME_LENGTH = 24;

/** The two paintable space types for each simple board type, in tool-palette order. */
export const SIMPLE_BOARD_SPACE_TYPES: Record<SimpleBoardType, [SpaceType, SpaceType]> = {
  moon: [SpaceType.LAND, SpaceType.LUNAR_MINE],
  venusPhase2: [SpaceType.LAND, SpaceType.GASLIGHT],
};

/**
 * The fixed (x, y) grid layout for a simple board type, in row-major order. Must match the
 * `tilesPerRow` arrays and offset math in `MoonBoard.ts`'s/`VenusSurfaceBoard.ts`'s own `Builder`
 * exactly -- this is the single source of truth both the codec/validator and the board classes'
 * custom-definition path read from, so the two can never drift apart.
 */
export function simpleBoardLayout(boardType: SimpleBoardType): Array<{x: number, y: number}> {
  if (boardType === 'venusPhase2') {
    // hexRowLayout produces a true regular hexagon (side length 4 here) -- see VENUS_SURFACE_ROWS.
    const layout: Array<{x: number, y: number}> = [];
    for (const row of hexRowLayout(VENUS_SURFACE_ROWS)) {
      for (let i = 0; i < row.width; i++) {
        layout.push({x: row.xOffset + i, y: row.y});
      }
    }
    return layout;
  }

  // Moon's board isn't a regular hexagon (it never needs to be -- MoonBoard.vue's real rendering
  // positions every hex by hand-tuned CSS keyed to its id, never by this x/y at all; only this
  // editor's own paint-grid canvas uses it, cosmetically). Kept byte-for-byte identical to
  // MoonBoard.ts's own hard-coded tilesPerRow/xOffset -- must never drift from it.
  const tilesPerRow = [4, 5, 6, 5, 6, 5, 4];
  const layout: Array<{x: number, y: number}> = [];
  for (let row = 0; row < tilesPerRow.length; row++) {
    const tilesInThisRow = tilesPerRow[row];
    // Row 3 (0-based) is a "central line 0-based x coord" special case -- see the identical
    // comment in MoonBoard.ts's own Builder.build().
    const xOffset = row === 3 ? 0 : 6 - tilesInThisRow;
    for (let i = 0; i < tilesInThisRow; i++) {
      layout.push({x: xOffset + i, y: row});
    }
  }
  return layout;
}

/** An all-LAND starting point for the map editor (and a convenient test fixture). */
export function blankSimpleBoard(boardType: SimpleBoardType, name: string): SimpleCustomBoardDefinition {
  const spaces = simpleBoardLayout(boardType).map((pos): SimpleCustomSpaceDef => ({
    x: pos.x,
    y: pos.y,
    spaceType: SpaceType.LAND,
    bonus: [],
  }));
  return {version: 1, boardType, name, spaces};
}
