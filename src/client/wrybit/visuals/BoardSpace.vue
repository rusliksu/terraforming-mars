<template>
  <div v-if="space !== undefined" :class="mainClass" :style="positionStyle" :data_space_id="space.id">
    <BoardSpaceTile
      :space="space"
      :aresExtension="aresExtension"
      :tileView="tileView"
    />
    <div class="board-space-text" v-if="text" v-i18n>{{ text }}</div>
    <Bonus :bonus="space.bonus" v-if="showBonus"/>
    <template v-if="tileView === 'coords'">
      <div class="board-space-coords">{{ getSpaceName(space.id) }}</div>
    </template>
    <template v-if="tileView === 'show'">
      <BoardCube v-if="space.color !== undefined" class="board-cube" :color="space.color" :spinSeed="space.id"/>
      <template v-if="space.gagarin !== undefined">
        <div v-if="space.gagarin === 0" class='gagarin'></div>
        <div v-else class='gagarin visited'></div>
      </template>
      <template v-if="space.cathedral === true">
        <div class='board-cube--cathedral'></div>
      </template>
      <template v-if="space.nomads === true">
        <div class='board-cube--nomad'></div>
      </template>
      <BoardSpaceCube v-if="space.cube !== undefined" :cube="space.cube"/>
      <UndergroundToken v-if="claimedToken !== undefined" :token="claimedToken" location="board"/>
      <div v-if="space.excavator !== undefined" class="underground-excavator" :class="'underground-excavator--' + space.excavator"></div>
      <div v-if="space.spaceType === SpaceType.DEFLECTION_ZONE" class="board-space-type-deflection-zone"></div>
    </template>
    <div class="board-log-highlight" :data_log_highlight_id="space.id"></div>
    </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalBoardSpace from '@/client/components/BoardSpace.vue';
import BoardCube from '@/client/wrybit/visuals/common/BoardCube.vue';
import BoardSpaceTile from './board/BoardSpaceTile.vue';

export default defineComponent({
  name: 'BoardSpace',
  extends: CanonicalBoardSpace,
  components: {BoardCube, BoardSpaceTile},
  computed: {
    showBonus(): boolean {
      return this.tileView !== 'coords' && (this.tileView === 'hide' || (this.space.tileType === undefined && this.space.cube === undefined));
    },
  },
});
</script>
