<template>
  <div class="discount-list">
    <div class="discount-list-title" v-i18n>* Additional discounts:</div>
    <table>
      <tr v-for="(discount, idx) in discounts" :key="idx">
        <td class="discount-list-amount"><div class="megacredits">-{{ discount.amount }}</div></td>
        <td class="discount-list-applies-to">{{ $t(discount.appliesTo) }}</td>
        <td class="discount-list-source">{{ $t(discount.source) }}</td>
      </tr>
    </table>
  </div>
</template>

<script setup lang="ts">
import {DiscountSource} from '@/client/wrybit/visuals/overview/discounts';

defineProps<{
  discounts: ReadonlyArray<DiscountSource>;
}>();
</script>
