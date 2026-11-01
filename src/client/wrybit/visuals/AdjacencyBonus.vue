<template>
  <div :class="positionClass">
    <i v-for="(suffix, idx) in bonus" :key="idx" :class="['adjacency-bonus', iconClass(suffix)]"></i>
  </div>
</template>

<script setup lang="ts">
import {computed, ComputedRef} from 'vue';
import {TileType} from '@/common/TileType';

const tileToSuffix: Partial<Record<TileType, Array<string>>> = {
  [TileType.BIOFERTILIZER_FACILITY]: ['plant', 'microbe'],
  [TileType.CAPITAL]: ['2mc'],
  [TileType.COMMERCIAL_DISTRICT]: ['2mc'],
  [TileType.DEIMOS_DOWN]: ['asteroid', 'steel'],
  [TileType.ECOLOGICAL_ZONE]: ['animal'],
  [TileType.GREAT_DAM]: ['energy', 'energy'],
  [TileType.INDUSTRIAL_CENTER]: ['steel'],
  [TileType.LAVA_FLOWS]: ['heat', 'heat'],
  [TileType.MAGNETIC_FIELD_GENERATORS]: ['plant', 'microbe'],
  [TileType.METALLIC_ASTEROID]: ['titanium'],
  [TileType.MINING_STEEL_BONUS]: ['steel'],
  [TileType.MINING_TITANIUM_BONUS]: ['titanium'],
  [TileType.MOHOLE_AREA]: ['heat', 'heat'],
  [TileType.NATURAL_PRESERVE]: ['megacredit'],
  [TileType.NUCLEAR_ZONE]: ['lose2mc'],
  [TileType.OCEAN_FARM]: ['plant'],
  [TileType.OCEAN_SANCTUARY]: ['animal'],
  [TileType.OCEAN_CITY]: ['city'],
  [TileType.RESTRICTED_AREA]: ['card'],
  [TileType.SOLAR_FARM]: ['energy', 'energy'],
};

// These icons only appear as adjacency bonuses, never as board space bonuses.
const adjacencyOnlyIcons = ['megacredit', '2mc', 'lose2mc'];

function iconClass(suffix: string): string {
  return adjacencyOnlyIcons.includes(suffix) ? `adjacency-bonus--${suffix}` : `board-space-bonus--${suffix}`;
}

const props = defineProps<{
  tileType: TileType;
}>();

const bonus: ComputedRef<Array<string>> = computed(() => {
  return tileToSuffix[props.tileType] ?? [];
});

const positionClass = computed(() => {
  let modifier = '';
  if (bonus.value.includes('lose2mc')) {
    modifier = ' lose2mc';
  } else if (bonus.value.includes('city')) {
    modifier = ' city';
  }
  return `adjacency-bonuses width--${bonus.value.length}${modifier}`;
});
</script>
