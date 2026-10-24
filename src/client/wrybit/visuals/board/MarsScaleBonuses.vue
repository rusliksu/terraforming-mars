<template>
  <span ref="root" class="mars-scale-bonuses" :style="{'--wrybit-mars-chip-scale': String(chipScale)}">
    <div v-for="pin in positioned" :key="pin.key" class="mars-scale-bonus" :style="pinStyle(pin)" :data-test="'mars-scale-bonus-' + pin.key">
      <span :class="['track-bonus-pin', {'track-bonus-pin--done': pin.done}]">
        <span class="track-bonus-pin__chips" :style="{transform: 'rotate(' + -pin.angle + 'deg)'}">
          <TrackBonusChip :bonus="pin.bonus" :kind="pin.done ? 'done' : 'own'"/>
        </span>
        <span class="track-bonus-link"></span>
      </span>
    </div>
    <span v-if="listed.length > 0" class="mars-scale-bonus-list">
      <span v-for="pin in listed" :key="pin.key" :data-test="'mars-scale-bonus-' + pin.key">
        <span>{{ $t(pin.scale) }} {{ pin.value }}</span>
        <TrackBonusChip :bonus="pin.bonus" :kind="pin.done ? 'done' : 'own'"/>
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import TrackBonusChip from '@/client/wrybit/visuals/trackBonus/TrackBonusChip.vue';
import {ScaleBonusPin} from './marsScaleBonuses';

const props = defineProps<{pins: ReadonlyArray<ScaleBonusPin>}>();
const root = ref<HTMLElement>();
const chipScale = ref(1);
let observer: ResizeObserver | undefined;
let observedBoard: HTMLElement | undefined;
const positioned = computed(() => props.pins.filter((pin) => pin.top !== undefined));
const listed = computed(() => props.pins.filter((pin) => pin.top === undefined));

function measure(board: HTMLElement) {
  const width = board.getBoundingClientRect().width;
  if (width > 0 && board.offsetWidth > 0) {
    chipScale.value = Math.round(board.offsetWidth / width * 1000) / 1000;
  }
}

function updateScale() {
  if (observedBoard !== undefined) {
    measure(observedBoard);
  }
}

onMounted(() => {
  const board = root.value?.closest<HTMLElement>('.board-cont');
  if (board !== null && board !== undefined) {
    observedBoard = board;
    measure(board);
    window.addEventListener('resize', updateScale);
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => measure(board));
      observer.observe(board);
      if (board.parentElement !== null) {
        observer.observe(board.parentElement);
      }
    }
  }
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener('resize', updateScale);
  observedBoard = undefined;
});

function pinStyle(pin: ScaleBonusPin): Record<string, string> {
  return {
    marginTop: pin.top + 'px', marginLeft: pin.left + 'px',
    transform: `translate(-100%, -50%) rotate(${pin.angle}deg) scale(var(--wrybit-mars-chip-scale, 1))`,
  };
}
</script>
