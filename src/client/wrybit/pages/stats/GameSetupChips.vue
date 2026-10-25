<template>
  <div class="game-setup-chips" :class="{'game-setup-chips--compact': compact}">
    <span v-for="chip in chips" :key="chip.key" class="game-setup-chip">
      <span v-if="chip.seatIcon === 'human'">♟</span>
      <span v-else-if="chip.seatIcon === 'ai'">🤖</span>
      <a v-if="chip.statsHref !== undefined" :href="chip.statsHref" data-stats-link>{{ chip.label }}</a>
      <span v-else>{{ chip.label }}</span>
    </span>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import {GameSetupChip} from './gameSetupChips';

export default defineComponent({
  name: 'GameSetupChips',
  props: {
    chips: {type: Array as PropType<ReadonlyArray<GameSetupChip>>, required: true},
    compact: {type: Boolean, default: false},
  },
});
</script>
