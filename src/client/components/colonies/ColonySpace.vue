<template>
  <div>
    <BuildBenefit v-if="idx <= 2" :metadata="metadata" :idx="idx"/>
    <div v-if="player !== undefined" class="occupied-colony-space">
      <div :class="playerCubeCss"></div>
    </div>
    <div v-if="marker" class="colony-track-marker"></div>
  </div>
</template>
<script lang="ts">

import {defineComponent} from 'vue';

import {ColonyName} from '@/common/colonies/ColonyName';
import {ColonyMetadata} from '@/common/colonies/ColonyMetadata';
import BuildBenefit from './BuildBenefit.vue';
import {Color, isReservedPlayerColor} from '@/common/Color';

export default defineComponent({
  components: {BuildBenefit},
  name: 'ColonyRow',
  props: {
    idx: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Object as () => ColonyMetadata,
      required: true,
    },
    player: {
      type: String as () => Color | undefined,
      default: undefined,
    },
    marker: {
      type: Boolean,
    },
  },
  computed: {
    playerCubeCss(): string {
      if (this.player === undefined) {
        return '';
      }
      let css = 'board-cube colony-cube board-cube--' + this.player;
      if (isReservedPlayerColor(this.player)) {
        css += ' board-cube--persona';
      }
      return css;
    },
    ColonyName(): typeof ColonyName {
      return ColonyName;
    },
  },
});
</script>
