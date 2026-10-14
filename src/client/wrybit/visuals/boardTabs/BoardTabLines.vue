<template>
  <!-- Short info of an inactive board tab: one thin segmented line per track (boardTabs.ts) -->
  <span class="board-tab-lines" aria-hidden="true">
    <span v-for="(track, trackIndex) in tracks" :key="trackIndex"
      :class="['board-tab-line', {'board-tab-line--fine': track.total > 12}]"
      :style="{'--wrybit-line-color': track.color, '--wrybit-line-height': lineHeight + 'px'}">
      <i v-for="cell in cells(track)" :key="cell.index" :class="cell.classes" :style="cell.style"></i>
    </span>
  </span>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import {BoardTabTrack} from './boardTabs';

type Cell = {
  index: number;
  classes: Array<string>;
  style: Record<string, string>;
};

// Player colours of the markers on the Delta line (same as the colour cubes)
const MARKER_COLOR: Record<string, string> = {
  red: '#e5533d', green: '#4caf50', blue: '#3f8ed8', yellow: '#e0c23a', black: '#777', purple: '#a06ad9', orange: '#e08a2e', pink: '#e06aa8', neutral: '#ccc',
};

export default defineComponent({
  name: 'BoardTabLines',
  props: {
    tracks: {
      type: Array as PropType<ReadonlyArray<BoardTabTrack>>,
      required: true,
    },
  },
  computed: {
    // Many tracks get thinner lines so the tab height stays the same
    lineHeight(): number {
      return this.tracks.length > 4 ? 3 : this.tracks.length === 1 ? 6 : 4;
    },
  },
  methods: {
    cells(track: BoardTabTrack): Array<Cell> {
      const next = track.bonus.find((step) => step > track.step);
      return Array.from({length: track.total}, (_, index) => {
        const number = track.markers === undefined ? index + 1 : index;
        const markers = track.markers?.filter((marker) => marker.at === index) ?? [];
        const classes: Array<string> = [];
        if (track.markers === undefined && index < track.step) {
          classes.push('board-tab-line__on');
        }
        // Bonus already passed: subtle dark dot in the filled segment
        if (track.markers === undefined && track.bonus.includes(number) && number <= track.step) {
          classes.push('board-tab-line__claimed');
        }
        if (number === next) {
          classes.push('board-tab-line__next');
        }
        const colors = markers.map((marker) => MARKER_COLOR[marker.color] ?? '#fff');
        const background = colors.length === 1 ? colors[0] : `linear-gradient(to right, ${colors.map((color, index) => `${color} ${index * 100 / colors.length}% ${(index + 1) * 100 / colors.length}%`).join(', ')})`;
        const style: Record<string, string> = colors.length === 0 ? {} : {background};
        return {index, classes, style};
      });
    },
  },
});
</script>
