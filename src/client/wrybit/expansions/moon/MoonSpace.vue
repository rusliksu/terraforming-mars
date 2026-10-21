<template>
  <div :class="mainClass" :data_space_id="space.id">
    <BoardSpaceTile
      :space="space"
      :aresExtension="false"
      :tileView="tileView"
    />
    <div class="board-space-text" v-if="text" v-i18n>{{ text }}</div>
    <Bonus v-if="(space.tileType === undefined || tileView === 'hide')" :bonus="space.bonus" />
    <div v-if="tileView === 'coords'" class="board-space-coords">{{ getSpaceName(space.id) }}</div>
    <BoardCube v-if="space.color !== undefined && tileView === 'show'" class="board-cube" :color="space.color" view="iso"/>
    <BoardCube v-if="space.coOwner !== undefined && tileView === 'show'" class="board-cube-coOwner" :color="space.coOwner" :size="11" view="iso"/>
    <div class="board-log-highlight" :data_log_highlight_id="space.id"></div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalMoonSpace from '@/client/components/moon/MoonSpace.vue';
import BoardCube from '@/client/wrybit/visuals/common/BoardCube.vue';
export default defineComponent({name: 'MoonSpace', extends: CanonicalMoonSpace, components: {BoardCube}});
</script>
