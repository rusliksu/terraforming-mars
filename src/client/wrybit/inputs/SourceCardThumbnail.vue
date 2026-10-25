<template><div class="card-intro-card"><Card :card="{name: card}"/></div></template>

<script setup lang="ts">
import type {CardName} from '@/common/cards/CardName';
import Card from '@/client/wrybit/visuals/card/Card.vue';
defineProps<{card: CardName}>();
</script>
