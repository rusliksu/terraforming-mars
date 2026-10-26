<template>
  <div class="row-resize-handle"
    role="separator" aria-orientation="horizontal" tabindex="0"
    :aria-label="$t('Row height')" :title="$t('Row height')"
    v-proximity-handle
    @pointerdown="startResize" @dblclick="resetResize"
    @keydown.up.prevent="nudgeResize(-1)" @keydown.down.prevent="nudgeResize(1)">
    <!-- Horizontal drag handle below a card of the player view (resize_handle.less): sets the height of the card directly
         above it (previous sibling). Invisible until the mouse approaches; double click = default height.
         Comment inside so the root stays a single element -->
  </div>
</template>

<script lang="ts">
import {markRaw, defineComponent, PropType} from 'vue';
import {vProximityHandle} from '@/client/wrybit/visuals/layout/ProximityHandle';
import {KEYBOARD_ROW_STEP, RowResizeTarget, clampHeight, startRowResize} from '@/client/wrybit/visuals/layout/rowResize';
import {loadStoredNumber, saveStoredNumber} from '@/client/wrybit/visuals/layout/layoutStorage';
import {playersCardTarget} from '@/client/wrybit/visuals/layout/playersCardFit';
import {marsCardTarget} from '@/client/wrybit/visuals/layout/rightColumnFit';

// Which card the handle resizes: the player table (left) or Mars (right)
export type RowResizeKind = 'players' | 'mars';

const STORAGE_KEYS: Record<RowResizeKind, string> = {
  players: 'wrybit.player-home.players_height',
  mars: 'wrybit.player-home.mars_height',
};
const BOARD_COLUMN_SELECTOR = '.player-home-columns__board';

export default defineComponent({
  name: 'RowResizeHandle',
  directives: {
    proximityHandle: vProximityHandle,
  },
  props: {
    kind: {
      type: String as PropType<RowResizeKind>,
      required: true,
    },
  },
  data() {
    return {layout: markRaw({stopDrag: undefined as (() => void) | undefined})};
  },
  beforeUnmount() {
    this.layout.stopDrag?.();
  },
  mounted() {
    // Restore the saved height – only where the handle is shown (fixed layout, player_home_fixed.less),
    // otherwise it could not be reset
    const stored = loadStoredNumber(STORAGE_KEYS[this.kind]);
    if (stored !== undefined && getComputedStyle(this.$el).display !== 'none') {
      this.target()?.apply(stored);
    }
  },
  methods: {
    target(): RowResizeTarget | undefined {
      const handle = this.$el as HTMLElement;
      const card = handle.previousElementSibling;
      if (!(card instanceof HTMLElement)) {
        return undefined;
      }
      if (this.kind === 'players') {
        // Without players PlayersOverview renders nothing; then there is no card to resize
        return card.querySelector('.players-table') === null ? undefined : playersCardTarget(card);
      }
      const column = handle.closest<HTMLElement>(BOARD_COLUMN_SELECTOR);
      return column === null ? undefined : marsCardTarget(column, card);
    },
    save(height: number | undefined) {
      saveStoredNumber(STORAGE_KEYS[this.kind], height);
    },
    startResize(event: PointerEvent) {
      const target = this.target();
      if (target !== undefined) {
        this.layout.stopDrag?.();
        this.layout.stopDrag = startRowResize(event, target, (height) => this.save(height));
      }
    },
    resetResize() {
      this.target()?.apply(undefined);
      this.save(undefined);
    },
    // Up arrow moves the handle up, the card gets smaller
    nudgeResize(direction: number) {
      const target = this.target();
      if (target !== undefined) {
        const height = clampHeight(target.current() + direction * KEYBOARD_ROW_STEP, target.limits());
        target.apply(height);
        this.save(height);
      }
    },
  },
});
</script>
