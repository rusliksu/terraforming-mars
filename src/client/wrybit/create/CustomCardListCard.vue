<template>
  <section class="create-game--block create-game-custom-list">
    <div class="create-game-card-head">
      <h2 v-i18n>{{ binding.title }}</h2>
      <span v-if="binding.selected.length" class="create-game-count">{{ binding.selected.length }}</span>
      <SegmentedControl class="create-game-custom-list-mode" v-model="mode" :options="MODE_OPTIONS"/>
    </div>
    <template v-if="mode === 'view'">
      <div v-if="unchanged" class="create-game-note" v-i18n>Same as the default selection</div>
      <template v-for="section in sections" :key="section.tone">
        <div v-if="section.names.length" class="create-game-subhead">
          <span v-i18n>{{ section.label }}</span>
          <span class="create-game-count">{{ section.names.length }}</span>
        </div>
        <CardPreviewGrid v-if="section.names.length" :names="section.names" :tone="section.tone"/>
      </template>
    </template>
    <div v-show="mode === 'edit'"><PresentationHost :hosts="binding.host"/></div>
  </section>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import type {CustomListBinding} from './presentation';
import type {CardName} from '@/common/cards/CardName';
import type {SegmentOption} from './createViewTypes';
import SegmentedControl from './SegmentedControl.vue';
import CardPreviewGrid from './CardPreviewGrid.vue';
import PresentationHost from '@/client/wrybit/inputs/PresentationHost.vue';

const props = defineProps<{binding: CustomListBinding}>();
const mode = ref<'view' | 'edit'>(props.binding.selected.length > 0 ? 'view' : 'edit');
const MODE_OPTIONS: ReadonlyArray<SegmentOption> = [{value: 'view', label: 'Show'}, {value: 'edit', label: 'Edit'}];
const sections = computed((): Array<{tone: 'removed' | 'added', label: string, names: ReadonlyArray<CardName>}> => {
  const selected = new Set(props.binding.selected);
  const baseline = new Set(props.binding.baseline);
  return [
    {tone: 'removed', label: 'Removed', names: selected.size === 0 ? [] : props.binding.baseline.filter((name) => !selected.has(name))},
    {tone: 'added', label: 'Added', names: props.binding.selected.filter((name) => !baseline.has(name))},
  ];
});
const unchanged = computed(() => sections.value.every((section) => section.names.length === 0));
</script>
