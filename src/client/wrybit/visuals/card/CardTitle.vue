<template>
  <CanonicalCardTitle v-bind="$props" />
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalCardTitle from '@/client/components/card/CardTitle.vue';

export default defineComponent({name: 'CardTitle', extends: CanonicalCardTitle, components: {CanonicalCardTitle}});
</script>
