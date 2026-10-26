<template>
  <div class="amount-side">
    <div class="amount-side__label">{{ $t(label) }}</div>
    <div class="amount-side__main">
      <span :class="['amount-side__icon', {'amount-side__icon--production': side.kind === 'production'}]"><i :class="iconClass"></i></span>
      <span v-if="before !== undefined && after !== undefined" class="amount-side__values">
        <span>{{ format(before) }}</span><span class="amount-side__arrow">→</span>
        <span :class="'amount-side__after--' + direction">{{ format(after) }}</span>
      </span>
      <span v-else class="amount-side__values">{{ change }}</span>
    </div>
    <span v-if="before !== undefined" :class="['amount-side__change', 'amount-side__change--' + direction]">{{ (direction === 'loss' ? '−' : '+') + change }}</span>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {AmountSideModel} from '@/common/models/AmountPreviewModel';
import {cardResourceCSS} from '@/client/components/common/cardResources';

const props = defineProps<{side: AmountSideModel, before?: number, after?: number, change: number, direction: 'loss' | 'gain'}>();
const label = computed(() => ({production: 'Production', card: 'On card', stock: 'Stock', cost: 'Costs'})[props.side.kind]);
const iconClass = computed(() => props.side.kind === 'card' ? ['card-resource', cardResourceCSS[props.side.resource]] :
  ['resource_icon', 'resource_icon--' + props.side.resource]);
function format(value: number): string {
  return props.side.kind === 'production' && value > 0 ? '+' + value : String(value);
}
</script>
