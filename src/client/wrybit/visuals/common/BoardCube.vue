<template>
  <!-- Player marker on a board or track: the acrylic PlayerCube in a fixed box, so the existing position classes
       (board-cube, board-cube-coOwner, colony-cube, ...) keep working. The colorblind symbol sits on top of it. -->
  <span :class="['board-cube-acrylic', 'board-cube--' + color]">
    <PlayerCube :color="color" :view="view" :size="size" />
    <span v-if="symbol !== ''" class="board-cube-acrylic__symbol">{{ symbol }}</span>
    <span v-if="$slots.default" class="board-cube-acrylic__label"><slot></slot></span>
  </span>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {Color} from '@/common/Color';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import type {PlayerCubeView} from '@/client/wrybit/visuals/common/PlayerCube.vue';
import {playerSymbol} from '@/client/utils/playerSymbol';

const props = withDefaults(defineProps<{
  color: Color;
  // iso: standing marker on the board (default); slight: next to text in lists and tables;
  // top: lying on a flat card
  view?: PlayerCubeView;
  // Edge length in px; 14 matches the footprint of the old flat board sprite
  size?: number;
}>(), {
  view: 'iso',
  size: 14,
});

const symbol = computed(() => playerSymbol(props.color));
</script>
