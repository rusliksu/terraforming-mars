<template>
  <span class="placement-tile-preview" aria-hidden="true"><BoardSpaceTile :space="space"/></span>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import BoardSpaceTile from '@/client/components/board/BoardSpaceTile.vue';
import type {TileType} from '@/common/TileType';
import type {SpaceModel} from '@/common/models/SpaceModel';
import {SpaceType} from '@/common/boards/SpaceType';

const props = defineProps<{tileType: TileType}>();
const space = computed((): SpaceModel => ({id: '00', x: 0, y: 0, spaceType: SpaceType.LAND, bonus: [], tileType: props.tileType}));
</script>
