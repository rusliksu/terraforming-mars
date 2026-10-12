<template>
  <svg class="venus-surface-board" :width="layoutWidth" :viewBox="`0 0 ${layoutWidth} ${layoutHeight}`" v-bind="$attrs">
    <foreignObject :width="layoutWidth" :height="layoutHeight">
      <div class="venus-surface-layout">
        <div v-if="showScaleTrack" class="venus-scale-track">
          <svg v-for="offset in scaleOffsets" :key="offset" viewBox="96 0 440 145" role="img"
            :aria-label="$t('Venus Scale') + ': ' + venusScaleLevel + ' / ' + venusScaleMax + '%'">
            <image href="assets/board/mars.png" width="620" height="600" class="venus-scale-track__art" :class="{'venus-scale-track__art--extension': offset > 0}"/>
            <foreignObject width="620" height="145">
              <div class="global-numbers">
                <div class="global-numbers-venus">
                  <div v-for="value in scaleValues" :key="value" class="global-numbers-value" :class="[
                    'val-' + value,
                    {'val-is-active': value + offset === venusScaleLevel && (offset === 0 || venusScaleLevel > 30)},
                  ]">{{ value + offset }}</div>
                </div>
                <div v-if="altVenusBoard && offset === 0" class="global-alt-venus">
                  <div v-for="value in [18, 20, 22, 24, 26, 28, 30]" :key="value" class="std-wild-resource" :class="'p' + value"></div>
                  <div class="wild-resource p30b"></div>
                </div>
              </div>
            </foreignObject>
          </svg>
        </div>
        <div class="venus-board-cont">
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
      </div>
    </foreignObject>
  </svg>
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
  // The frame scales the track, planet and tile grid together.
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
    venusScaleLevel: {
      type: Number,
      default: 0,
    },
    venusScaleMax: {
      type: Number,
      default: 30,
    },
    altVenusBoard: {
      type: Boolean,
      default: false,
    },
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
    layoutWidth(): number {
      return this.boardPixelSize.width + 40;
    },
    layoutHeight(): number {
      // Matches the arc width and overlap in venusphase2.less.
      const trackHeight = this.showScaleTrack ? 12 + this.layoutWidth * (this.scaleOffsets.length * 145 / 440 * 0.81 - 0.16) : 0;
      return this.boardPixelSize.height + 40 + trackHeight;
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
    scaleValues(): Array<number> {
      return Array.from({length: 16}, (_, index) => index * 2);
    },
    scaleOffsets(): Array<number> {
      return this.venusScaleMax > 30 ? [0, 30] : [0];
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

</script>
