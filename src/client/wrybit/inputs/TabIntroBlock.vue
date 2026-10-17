<template>
  <div class="or-tab-intro">
    <PlacementTile :tileType="tileType"/>
    <div>
      <div v-if="finale" class="or-tab-intro-finale" v-i18n>Mars is terraformed</div>
      <div class="or-tab-intro-title">{{ $t(title) }}</div>
      <div v-for="(fact, index) in facts" :key="index" class="or-tab-intro-hint">{{ $t(fact) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {TileType} from '@/common/TileType';
import type {Message} from '@/common/logs/Message';
import PlacementTile from './PlacementTile.vue';

defineProps<{tileType: TileType, title: string | Message, facts: ReadonlyArray<string | Message>, finale: boolean}>();
</script>
