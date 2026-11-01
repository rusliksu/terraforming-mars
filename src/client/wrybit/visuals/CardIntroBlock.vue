<template>
  <!-- Intro at the top of a tab box when a card triggers the input (inputSourceCard.ts):
       the card itself scaled down, next to it its name instead of "Select an option", its text and – if
       it says more than "Select an option" – the actual question. Structure like TabIntroBlock.vue. -->
  <div class="or-tab-intro card-intro">
    <SourceCardThumbnail :card="card" :model="model" />
    <div>
      <div class="or-tab-intro-title card-intro-name">{{ $t(model?.combinedDisplayName ?? card) }}</div>
      <div v-if="description !== undefined" class="or-tab-intro-hint">{{ $t(description) }}</div>
      <div v-if="!isGenericTitle(title)" class="card-intro-question">{{ $t(title) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {Message} from '@/common/logs/Message';
import {CardModel} from '@/common/models/CardModel';
import {CardName} from '@/common/cards/CardName';
import SourceCardThumbnail from './SourceCardThumbnail.vue';
import {cardDescriptionText, isGenericTitle} from './cardIntroText';

const props = defineProps<{
  card: CardName;
  model?: CardModel;
  title: string | Message;
}>();

const description = computed(() => cardDescriptionText(props.card, props.model));
</script>
