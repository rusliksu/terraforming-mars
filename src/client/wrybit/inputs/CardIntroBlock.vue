<template>
  <div class="or-tab-intro card-intro">
    <SourceCardThumbnail :card="card" />
    <div>
      <div class="or-tab-intro-title card-intro-name">{{ $t(card) }}</div>
      <div v-if="description !== undefined" class="or-tab-intro-hint">{{ $t(description) }}</div>
      <div v-if="!isGenericTitle(title)" class="card-intro-question">{{ $t(title) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {CardName} from '@/common/cards/CardName';
import type {Message} from '@/common/logs/Message';
import SourceCardThumbnail from './SourceCardThumbnail.vue';
import {cardDescriptionText, isGenericTitle} from './inputSourceCard';

const props = defineProps<{card: CardName, title: string | Message}>();
const description = computed(() => cardDescriptionText(props.card));
</script>
