<template>
  <CanonicalCardCost v-bind="$props" />
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalCardCost from '@/client/components/card/CardCost.vue';

export default defineComponent({name: 'CardCost', extends: CanonicalCardCost, components: {CanonicalCardCost}});
</script>
