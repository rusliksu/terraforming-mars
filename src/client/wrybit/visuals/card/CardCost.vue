<template>
  <div>
    <div :class="getClasses()">{{ amount }}</div>
    <template v-if="displayTwoCosts()">
      <div class="card-cost-transition"></div>
      <div class="card-old-cost">{{ newCost }}</div>
    </template>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalCardCost from '@/client/components/card/CardCost.vue';

export default defineComponent({name: 'CardCost', extends: CanonicalCardCost});
</script>
