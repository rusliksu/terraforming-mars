<template>
  <!-- Triggering card, scaled down at the top of a tab box (or_options_tabs.less, .card-intro-card);
       shared by CardIntroBlock.vue and TabIntroBlock.vue -->
  <div class="card-intro-card">
    <Card v-if="known" :card="model ?? {name: card}"/>
    <span v-else>{{ $t(card) }}</span>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {getCard} from '@/client/cards/ClientCardManifest';
import {CardModel} from '@/common/models/CardModel';
import {CardName} from '@/common/cards/CardName';
import Card from '@/client/wrybit/visuals/card/Card.vue';

const props = defineProps<{
  card: CardName;
  model?: CardModel;
}>();
const known = computed(() => getCard(props.card) !== undefined || props.model?.customCard !== undefined);
</script>
