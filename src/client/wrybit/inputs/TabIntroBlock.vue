<template>
  <div class="or-tab-intro">
    <PlacementTile :tileType="tileType"/>
    <div>
      <div v-if="finale !== undefined" class="or-tab-intro-finale">{{ $t(finale === 'terraformed' ? 'Mars is terraformed' : 'Final greenery') }}</div>
      <div class="or-tab-intro-title">{{ $t(title) }}</div>
      <div v-for="(fact, index) in facts" :key="index" class="or-tab-intro-hint">{{ $t(fact) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {TileType} from '@/common/TileType';
import type {Message} from '@/common/logs/Message';
import PlacementTile from './PlacementTile.vue';

defineProps<{tileType: TileType, title: string | Message, facts: ReadonlyArray<string | Message>, finale?: 'terraformed' | 'final-greenery'}>();
</script>
