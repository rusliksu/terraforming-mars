<template>
  <!-- The official Mars-board Venus curve only has room painted for 0-30 -- Venus Phase 2's
       extended 30-60 range gets its own standalone curve here, shown above the Venus board itself.
       Deliberately a separate top-level element, not a child of .venus-board-cont: that container's
       backdrop is sized as a percentage of its own box, so a normal-flow child inside it would both
       push the hex grid down AND distort the backdrop's sizing relative to the grid (see
       feedback_venus-track-layout for the earlier attempt that did exactly this and had to be
       reverted). Living outside .venus-board-cont means neither the grid nor the backdrop is
       touched -- this just adds its own row above the whole board block. Always shown once
       showScaleTrack is true (not just once the scale passes 30) so it doesn't pop in
       mid-generation. -->
  <div v-if="showScaleTrack" class="venus-scale-track-2-row">
    <div class="venus-scale-track-2">
      <div v-if="venus2MarkerStyle !== undefined" class="venus-scale-track-2__marker" :style="venus2MarkerStyle"></div>
    </div>
  </div>
  <div class="venus-board-cont" v-bind="$attrs">
    <div class="board board--venus" :style="boardStyle" id="venus_board">
      <BoardSpace
        v-for="curSpace in gridSpaces"
        :key="curSpace.id"
        :space="curSpace"
        :aresExtension="false"
        :tileView="tileView"
        :pixel="pixelFor(curSpace)"
        data-test="venus-board-space"
      />
      <svg v-if="reservedLegendEntries.length > 0" :width="boardPixelSize.width" :height="boardPixelSize.height" class="venus-board-legend">
        <g v-for="entry in reservedLegendEntries" :key="entry.id">
          <line :x1="entry.labelX" :y1="entry.lineY" :x2="entry.dotX" :y2="entry.dotY" class="board-line"/>
          <circle :cx="entry.dotX" :cy="entry.dotY" r="2" class="board-caption board_caption--black"/>
          <text class="board-caption" :x="entry.labelX" :y="entry.labelY" :text-anchor="entry.textAnchor">
            <tspan v-for="(line, idx) in entry.lines" :key="idx" :x="entry.labelX" :dy="idx === 0 ? 0 : 12">{{ line }}</tspan>
          </text>
        </g>
      </svg>
    </div>
    <div v-if="outerSpaces.length > 0" id="venus_board_outer_spaces" class="venus-board-outer-spaces">
      <BoardSpace
        v-for="curSpace in outerSpaces"
        :key="curSpace.id"
        :space="curSpace"
        :aresExtension="false"
        :tileView="tileView"
        :text="reservedSpaceText(curSpace.id)"
      />
    </div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {VenusPhase2Model} from '@/common/models/VenusPhase2Model';
import {SpaceModel} from '@/common/models/SpaceModel';
import {SpaceId} from '@/common/Types';
import BoardSpace from '@/client/components/BoardSpace.vue';
import {TileView} from '../board/TileView';
import {HEX_HEIGHT, HEX_WIDTH, customBoardPixelSize, customSpacePixel} from '@/common/boards/CustomBoardDefinition';

// Kept in sync with src/server/venusPhase2/VenusSurfaceBoard.ts's own VENUS_STRATOPOLIS/
// VENUS_MAXWELL_BASE constants -- fixed ids, distinct from the Mars board's SpaceName.STRATOPOLIS/
// MAXWELL_BASE ('72'/'73'), since this is a genuinely separate board. Labeled the same way whether
// the reservation landed on-grid (a real map-editor-chosen hex) or the off-grid fallback.
//
// On-grid, this doubles as the leader-line legend's per-space text lines (see
// reservedLegendEntries below) -- kept as an array here so a two-word name like "Maxwell Base"
// renders as two separate <tspan> rows, the same way Noctis City's Mars-board legend does.
const RESERVED_SPACE_TEXT: Partial<Record<SpaceId, Array<string>>> = {
  '298': ['Stratopolis'],
  '299': ['Maxwell', 'Base'],
};

export default defineComponent({
  name: 'VenusSurfaceBoard',
  // Two root nodes now (the 30-60 track row plus the board itself) -- Vue can't guess which one
  // GameBoardView.vue's id="shortkey-venusBoard" (or any other fallthrough attr) belongs on, so it
  // drops them silently without this. Bind explicitly to .venus-board-cont, matching where it used
  // to land back when this component had a single root.
  inheritAttrs: false,
  props: {
    model: {
      type: Object as () => VenusPhase2Model,
      required: true,
    },
    tileView: {
      type: String as () => TileView,
      default: 'show',
    },
    // Only used to position the marker on the 30-60 extension curve below -- omitted entirely
    // (SimpleMapEditor.vue's preview call site, which has no live game) just means no marker.
    venusScaleLevel: {
      type: Number,
      default: 0,
    },
    // False for SimpleMapEditor.vue's hex-layout preview -- that page already has its own,
    // separate 30-60 track calibration tool right above this preview, so this component's own
    // copy of the track would otherwise show twice on the same page (once for calibrating,
    // once floating uselessly above the tiny preview planet with no marker on it, since that
    // call site has no real venusScaleLevel to show).
    showScaleTrack: {
      type: Boolean,
      default: true,
    },
  },
  components: {
    BoardSpace,
  },
  computed: {
    // Off-grid vs on-grid is about position, not SpaceType.COLONY, on this board: Stratopolis/
    // Maxwell Base's reserved spot is COLONY-typed either way (so normal tile placement already
    // excludes it -- see VenusSurfaceBoard.ts's getAvailableSpacesForLand/Gaslight), but a
    // map-editor-chosen reservation gets a real (x, y) and belongs on the main grid; only the
    // off-grid fallback (x=-1, y=-1) belongs in the separate outer-spaces tray.
    gridSpaces(): Array<SpaceModel> {
      return this.model.spaces.filter((space) => !(space.x === -1 && space.y === -1));
    },
    outerSpaces(): Array<SpaceModel> {
      return this.model.spaces.filter((space) => space.x === -1 && space.y === -1);
    },
    maxY(): number {
      return this.gridSpaces.reduce((max, space) => Math.max(max, space.y), 0);
    },
    maxX(): number {
      return this.gridSpaces.reduce((max, space) => Math.max(max, space.x), 0);
    },
    boardPixelSize(): {width: number, height: number} {
      return customBoardPixelSize(this.maxX, this.maxY);
    },
    boardStyle(): Record<string, string> {
      const {width, height} = this.boardPixelSize;
      return {width: `${width}px`, height: `${height}px`};
    },
    // Noctis-City-style callout labels (a small dot on the space, a leader line, and the name off
    // to the side) for Stratopolis/Maxwell Base whenever their reservation landed on the main grid
    // -- computed from each space's actual current pixel position (not hand-tuned per-board pixel
    // coordinates like Mars's SVG legends use) so this still lines up correctly even when a
    // map-editor-chosen reservation moved the spot somewhere else on a custom board layout.
    //
    // The label is pushed outward along the vector from the board's own center through the dot
    // (not just left/right), and far enough out (2 hexes' worth) to clear a full ring of
    // neighboring tiles instead of landing right on top of them -- both axes pick their direction
    // from which side of the board center the dot falls on, so it's pushed toward whichever edge
    // is actually closest (and therefore has open backdrop beyond the grid to land in).
    reservedLegendEntries(): Array<{
      id: SpaceId,
      lines: Array<string>,
      dotX: number,
      dotY: number,
      labelX: number,
      labelY: number,
      lineY: number,
      textAnchor: 'start' | 'end',
    }> {
      const {width: boardWidth, height: boardHeight} = this.boardPixelSize;
      const entries = [];
      for (const space of this.gridSpaces) {
        const lines = RESERVED_SPACE_TEXT[space.id];
        if (lines === undefined) {
          continue;
        }
        const pixel = this.pixelFor(space);
        const dotX = pixel.left + HEX_WIDTH / 2;
        const dotY = pixel.top + HEX_HEIGHT / 2;
        // Push AWAY from center, toward whichever edge the dot is already closer to (that's
        // where the open backdrop is, not more hexes).
        const pushRight = dotX >= boardWidth / 2;
        const pushDown = dotY >= boardHeight / 2;
        const labelX = dotX + (pushRight ? 1 : -1) * HEX_WIDTH * 1.8;
        const labelY = dotY + (pushDown ? 1 : -1) * HEX_HEIGHT * 1.6;
        // Touch the leader line to whichever edge of the (possibly 2-line) text block actually
        // faces back toward the dot, instead of always the first line's baseline.
        const lineY = pushDown ? labelY - 8 : labelY + 12 * (lines.length - 1) + 3;
        entries.push({
          id: space.id,
          lines,
          dotX,
          dotY,
          labelX,
          labelY,
          lineY,
          // Text reads away from the dot, not back over it.
          textAnchor: pushRight ? 'start' as const : 'end' as const,
        });
      }
      return entries;
    },
    // Percent-based (not px) so it stays correct regardless of how large venus-track-30-60.png
    // is actually displayed -- see VENUS_2_TRACK_POSITIONS below for where these numbers come
    // from. undefined below 30 (nothing on this curve to point at yet) or for an odd value (never
    // happens in a real game -- Venus's step is always 2 -- but SimpleMapEditor.vue's calibration
    // tool can be mid-calibration with gaps).
    venus2MarkerStyle(): Record<string, string> | undefined {
      const point = VENUS_2_TRACK_POSITIONS[this.venusScaleLevel];
      if (point === undefined) {
        return undefined;
      }
      return {left: `${point.left * 100}%`, top: `${point.top * 100}%`};
    },
  },
  methods: {
    pixelFor(space: SpaceModel): {left: number, top: number} {
      return customSpacePixel(space.x, space.y, this.maxY);
    },
    reservedSpaceText(id: SpaceId): string | undefined {
      return RESERVED_SPACE_TEXT[id]?.join(' ');
    },
  },
});

// Fractional (0-1) position of each tick mark on venus-track-30-60.png's own painted arc, keyed
// by the Venus scale value it represents. Venus's step is always 2, so this only ever needs an
// exact lookup (unlike @venus-vals's interpolated-odd-value approach from an earlier, abandoned
// 1-unit-step design) -- no in-between value is ever actually reached.
//
// Calibrated in-browser via SimpleMapEditor.vue's Venus Phase 2 track-calibration tool (click
// each tick mark in order, then "Copy positions") -- not an eyeballed guess like the values this
// replaced.
const VENUS_2_TRACK_POSITIONS: Record<number, {left: number, top: number}> = {
  30: {left: 0.069, top: 0.731},
  32: {left: 0.121, top: 0.618},
  34: {left: 0.179, top: 0.504},
  36: {left: 0.234, top: 0.391},
  38: {left: 0.290, top: 0.342},
  40: {left: 0.348, top: 0.253},
  42: {left: 0.411, top: 0.229},
  44: {left: 0.474, top: 0.205},
  46: {left: 0.529, top: 0.205},
  48: {left: 0.590, top: 0.237},
  50: {left: 0.653, top: 0.269},
  52: {left: 0.711, top: 0.342},
  54: {left: 0.766, top: 0.415},
  56: {left: 0.819, top: 0.496},
  58: {left: 0.874, top: 0.609},
  60: {left: 0.924, top: 0.739},
};
</script>
