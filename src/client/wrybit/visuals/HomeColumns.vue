<template>
  <div :class="['player-home-columns', {'player-home-columns--board-collapsed': boardCollapsed}]" :ref="trackColumns">
    <!-- Two-column layout of the player and spectator view (player_home_columns.less): left #main, right #board.
         The board comes first in the DOM (hotkey order, narrow screens) and is placed on the right via CSS.
         Comment inside so the root stays a single element -->
    <div class="player-home-columns__board" :ref="trackBoardColumn">
      <slot name="board"></slot>
    </div>

    <!-- Drag handle between the columns (only visible in the two-column layout): splits the width, double click = default.
         Invisible until the mouse approaches (handleProximity.ts) -->
    <div class="player-home-columns__resizer"
      v-proximity-handle
      role="separator" aria-orientation="vertical" tabindex="0"
      :aria-valuenow="boardShare" :aria-valuemin="minBoardShare" :aria-valuemax="maxBoardShare"
      :aria-label="$t('Column width')" :title="$t('Column width')"
      @pointerdown="startResize" @dblclick="resetResize"
      @keydown.left.prevent="nudgeResize(1)" @keydown.right.prevent="nudgeResize(-1)">
      <!-- Left / right split, only visible while dragging or with keyboard focus -->
      <span class="player-home-columns__resizer-label" aria-hidden="true">{{ columnSplitLabel }}</span>
    </div>

    <div class="player-home-columns__main">
      <slot name="main"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import {markRaw, defineComponent} from 'vue';
import {observeBoardColumn} from '@/client/wrybit/visuals/layout/boardColumnPosition';
import {vProximityHandle} from '@/client/wrybit/visuals/layout/ProximityHandle';
import {observeRightColumnFit} from '@/client/wrybit/visuals/layout/rightColumnFit';
import {
  DEFAULT_BOARD_SHARE, KEYBOARD_STEP, MAX_BOARD_SHARE, MIN_BOARD_SHARE,
  applyBoardShare, loadBoardShare, setBoardShare, shareLabel, startColumnResize,
} from '@/client/wrybit/visuals/layout/columnResize';

function observeBoardColumnFully(column: HTMLElement): () => void {
  const stopPosition = observeBoardColumn(column);
  const stopFit = observeRightColumnFit(column);
  return () => {
    stopPosition();
    stopFit();
  };
}

export default defineComponent({
  name: 'HomeColumns',
  directives: {
    proximityHandle: vProximityHandle,
  },
  props: {
    // Right column (board) hidden, the left one takes the full width (setup phase, SetupBoardToggle)
    boardCollapsed: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      // Share of the right column in percent (columnResize.ts)
      boardShare: loadBoardShare(),
      layout: markRaw({
        columnsElement: undefined as HTMLElement | undefined,
        boardElement: undefined as HTMLElement | undefined,
        stopObserver: undefined as (() => void) | undefined,
        stopDrag: undefined as (() => void) | undefined,
      }),
    };
  },
  computed: {
    columnSplitLabel(): string {
      return shareLabel(this.boardShare);
    },
    minBoardShare(): number {
      return MIN_BOARD_SHARE;
    },
    maxBoardShare(): number {
      return MAX_BOARD_SHARE;
    },
  },
  beforeUnmount() {
    this.layout.stopDrag?.();
    this.layout.stopObserver?.();
    this.layout.stopObserver = undefined;
  },
  methods: {
    // Function ref of the column container: apply the saved split immediately
    // (called with the element, or with null on removal)
    trackColumns(element: unknown) {
      this.layout.columnsElement = element instanceof HTMLElement ? element : undefined;
      if (this.layout.columnsElement !== undefined) {
        applyBoardShare(this.layout.columnsElement, this.boardShare);
      }
    },
    trackBoardColumn(element: unknown) {
      const column = element instanceof HTMLElement ? element : undefined;
      if (column === this.layout.boardElement) {
        return;
      }
      this.layout.stopObserver?.();
      this.layout.boardElement = column;
      this.layout.stopObserver = column === undefined ? undefined : observeBoardColumnFully(column);
    },
    startResize(event: PointerEvent) {
      const columnsElement = this.layout.columnsElement;
      if (columnsElement !== undefined) {
        this.layout.stopDrag?.();
        this.layout.stopDrag = startColumnResize(event, columnsElement, (share) => {
          this.boardShare = share;
        });
      }
    },
    resetResize() {
      const columnsElement = this.layout.columnsElement;
      if (columnsElement !== undefined) {
        this.boardShare = setBoardShare(columnsElement, DEFAULT_BOARD_SHARE);
      }
    },
    // Left arrow key moves the handle left, the right column gets wider
    nudgeResize(direction: number) {
      const columnsElement = this.layout.columnsElement;
      if (columnsElement !== undefined) {
        this.boardShare = setBoardShare(columnsElement, this.boardShare + direction * KEYBOARD_STEP);
      }
    },
  },
});
</script>
