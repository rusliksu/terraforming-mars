<template>
  <img v-if="standard" :src="'assets/wrybit/figures/astronaut-' + (color ?? 'neutral') + '.png'" :width="size" :height="size * 1.3" alt="">
  <PlayerCube v-else :color="color ?? 'neutral'" view="slight" :size="size" />
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {Color} from '@/common/Color';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';

const props = withDefaults(defineProps<{color?: Color, size?: number}>(), {color: undefined, size: 18});
// Source baked figures cover the standard palette; preserve our persona colours with our own cube.
const standard = computed(() => props.color === undefined || ['red', 'yellow', 'green', 'black', 'blue', 'purple', 'orange', 'pink', 'neutral'].includes(props.color));
</script>
