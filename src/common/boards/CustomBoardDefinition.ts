import {SpaceBonus} from './SpaceBonus';
import {SpaceType} from './SpaceType';
import {SpaceId, isSpaceId, safeCast} from '../Types';
import {MilestoneName} from '../ma/MilestoneName';
import {AwardName} from '../ma/AwardName';
import {GlobalParametersConfig} from '../GlobalParameterConfig';

/**
 * A user-authored Mars board. Produced by the map editor, serialized into a share code by
 * `customBoardCodec`, and carried on `GameOptions.customBoard` for the life of a game.
 */
export interface CustomBoardDefinition {
  version: 1;
  /** Display name; shown as the board's name in the create-game form and as a caption. */
  name: string;
  /** Number of hex rows. Odd, between MIN_CUSTOM_ROWS and MAX_CUSTOM_ROWS. */
  rows: number;
  /** The present hexes, in row-major order. Absent grid cells are voids in the outline. */
  spaces: Array<CustomSpaceDef>;
  /** Exactly 5 milestones, or empty for random selection. */
  milestones: Array<MilestoneName>;
  /** Exactly 5 awards, or empty for random selection. */
  awards: Array<AwardName>;
  /** Optional global-parameter track overrides. Absent means the official tracks. */
  globalParameters?: GlobalParametersConfig;
  /** Optional M€ costs for the ocean/temperature/colony placement bonuses. Absent means the official costs. */
  placementBonusCosts?: PlacementBonusCosts;
}

/**
 * M€ cost of the "also do X" placement bonuses (SpaceBonus.OCEAN / TEMPERATURE / COLONY),
 * charged via SelectPaymentDeferred when a player places a tile on a space carrying one.
 * Defaults match the official boards that use each bonus (Hellas, Vastitas Borealis, Terra
 * Cimmeria Nova).
 */
export interface PlacementBonusCosts {
  ocean: number;
  temperature: number;
  colony: number;
}

export interface CustomSpaceDef {
  id: SpaceId;
  x: number;
  y: number;
  spaceType: SpaceType;
  volcanic?: boolean;
  /** Excluded from generic land placement (like Tharsis' Noctis City). */
  reserved?: boolean;
  bonus: Array<SpaceBonus>;
}

/** Custom Mars space ids start here, past the official 2-digit ids and colony spaces. */
export const CUSTOM_BOARD_ID_BASE = 100;
export const MIN_CUSTOM_ROWS = 3;
export const MAX_CUSTOM_ROWS = 21;
export const MAX_CUSTOM_NAME_LENGTH = 24;

export type HexRow = {y: number, width: number, xOffset: number};

/**
 * The bounding regular hexagon for a board of `rows` rows, matching the coordinate convention
 * of the standard `BoardBuilder` (widest row has `rows` tiles; narrower rows are pushed right
 * by `rows - width`).
 */
export function hexRowLayout(rows: number): Array<HexRow> {
  const side = (rows + 1) / 2;
  const layout: Array<HexRow> = [];
  for (let y = 0; y < rows; y++) {
    const width = side + Math.min(y, rows - 1 - y);
    layout.push({y, width, xOffset: rows - width});
  }
  return layout;
}

/** Total cells in the bounding hexagon for `rows` rows. */
export function hexCellCount(rows: number): number {
  return hexRowLayout(rows).reduce((sum, row) => sum + row.width, 0);
}

// --- client pixel layout ---------------------------------------------------------------------
// The official boards position each hex with a hand-tuned `.board-space-NN` CSS rule over a
// painted background image. Custom boards have neither, so their hexes are placed by formula.
// These constants are reverse-engineered from board_items_positions.less and reproduce the
// standard Tharsis positions exactly when maxY === 8.
export const HEX_WIDTH = 49;
export const HEX_HEIGHT = 41;
const HEX_LEFT_PAD = 6;
const HEX_TOP_PAD = 34;

/** Top/left pixel offset (a `.board-space` margin) for the hex at grid coordinate (x, y). */
export function customSpacePixel(x: number, y: number, maxY: number): {left: number, top: number} {
  const midDistance = Math.min(y, maxY - y);
  const rowShift = (HEX_WIDTH / 2) * (midDistance - maxY / 2);
  return {
    left: HEX_WIDTH * x + HEX_LEFT_PAD + rowShift,
    top: HEX_TOP_PAD + HEX_HEIGHT * y,
  };
}

/** Pixel size of the scrollable board area needed to hold a custom board. */
export function customBoardPixelSize(maxX: number, maxY: number): {width: number, height: number} {
  const right = customSpacePixel(maxX, maxY / 2, maxY).left;
  const bottom = customSpacePixel(0, maxY, maxY).top;
  return {width: right + 46 + 40, height: bottom + 51 + 20};
}

/** The space id for the Nth custom hex (row-major), e.g. index 0 -> '100'. */
export function customSpaceId(index: number): SpaceId {
  return safeCast(String(CUSTOM_BOARD_ID_BASE + index), isSpaceId);
}

/** A full hexagon of empty land, no bonuses, no milestones/awards chosen. */
export function blankCustomBoard(rows: number, name: string): CustomBoardDefinition {
  const spaces: Array<CustomSpaceDef> = [];
  let index = 0;
  for (const row of hexRowLayout(rows)) {
    for (let i = 0; i < row.width; i++) {
      spaces.push({
        id: customSpaceId(index),
        x: row.xOffset + i,
        y: row.y,
        spaceType: SpaceType.LAND,
        bonus: [],
      });
      index++;
    }
  }
  return {version: 1, name, rows, spaces, milestones: [], awards: []};
}
