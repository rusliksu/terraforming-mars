<!-- The discount badge on the cards-in-hand icon, marked when there are conditional discounts. -->
<template>
  <div class="player-tag-discount hand-discount" :class="{'hand-discount--conditional': conditional.length > 0}">
    <div class="megacredits-container">
      <div class="megacredits">{{ label }}</div>
    </div>
    <div v-if="conditional.length > 0" class="hand-discount-popover">
      <DiscountList :discounts="conditional"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {DiscountSource} from '@/client/wrybit/visuals/overview/discounts';
import DiscountList from '@/client/wrybit/visuals/overview/DiscountList.vue';

const props = defineProps<{
  // The discount that applies to every card.
  amount: number;
  // Discounts that only apply to some cards, e.g. cards with requirements.
  conditional: ReadonlyArray<DiscountSource>;
}>();

const label = computed(() => {
  const asterisk = props.conditional.length > 0 ? '*' : '';
  return props.amount > 0 ? `-${props.amount}${asterisk}` : asterisk;
});
</script>
