<template>
  <div class="high-orbit-market">
    <div class="high-orbit-market-title" v-i18n>Infrastructure Market</div>
    <div
      v-for="(row, rowIdx) in market"
      :key="rowIdx"
      class="high-orbit-market-row"
      :class="{'high-orbit-market-row--locked': row.locked}">
      <div v-if="row.locked" class="high-orbit-market-row-lock" v-i18n>Locked this generation</div>
      <div class="high-orbit-market-slots">
        <div v-for="(cardName, slotIdx) in row.slots" :key="slotIdx" class="high-orbit-market-slot">
          <Card v-if="cardName !== undefined && cardName !== null" :card="{name: cardName, isDisabled: row.locked}"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import {defineComponent, PropType} from 'vue';
import Card from '@/client/components/card/Card.vue';
import {HighOrbitMarketRow} from '@/common/highOrbit/HighOrbitMarket';

export default defineComponent({
  name: 'HighOrbitMarket',
  components: {
    Card,
  },
  props: {
    market: {
      type: Array as PropType<ReadonlyArray<HighOrbitMarketRow>>,
      required: true,
    },
  },
});

</script>
