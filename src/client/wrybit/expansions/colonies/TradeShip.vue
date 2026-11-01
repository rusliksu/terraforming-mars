<template>
  <span class="trade-ship" :style="{width: size + 'px', height: size + 'px'}">
    <img :src="'assets/wrybit/ships/shuttle-' + shipColor + '.png'" :width="size" :height="size" alt="">
    <PlayerCube v-if="personal" class="trade-ship__identity" :color="color" :size="Math.max(9, size / 3)" />
  </span>
</template>

<script setup lang="ts">
// Wrybit shuttle art; native personal identities remain visible on their fleets.
import {computed} from 'vue';
import {DEFAULT_PLAYER_COLORS, RESERVED_PLAYER_COLORS} from '@/common/Color';
import type {Color} from '@/common/Color';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';

const props = withDefaults(defineProps<{color: Color, size?: number}>(), {size: 28});
const personal = computed(() => (RESERVED_PLAYER_COLORS as ReadonlyArray<Color>).includes(props.color));

// Reserved identities have no dedicated shuttle art. They used to fall back to the neutral grey
// shuttle, which made every personal fleet look unavailable. Map each reserved palette to the
// nearest classic hull so the whole shuttle stays in colour; the identity cube still carries the
// exact player colour.
const RESERVED_SHIP_HULL: Readonly<Record<string, string>> = {
  gold: 'yellow',
  emerald: 'green',
  ginger: 'orange',
  pearl: 'black',
  antistress: 'pink',
  gambit: 'red',
  turquoise: 'blue',
  vanger: 'green',
  serge: 'red',
  credicor: 'red',
  rigatone: 'orange',
  rigatone2: 'orange',
  hydro: 'blue',
  saturn: 'purple',
  saturnrings: 'purple',
  titan: 'blue',
  saturnstorm: 'purple',
  catseye: 'pink',
};
const shipColor = computed(() => {
  if ((DEFAULT_PLAYER_COLORS as ReadonlyArray<Color>).includes(props.color)) {
    return props.color;
  }
  return RESERVED_SHIP_HULL[props.color] ?? 'neutral';
});
</script>

<style scoped>
.trade-ship {
  position: relative;
}

.trade-ship img {
  display: block;
  object-fit: contain;
}

.trade-ship__identity {
  position: absolute;
  right: 0;
  bottom: 0;
}
</style>
