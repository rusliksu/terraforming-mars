<template>
  <div data-hotkey-group :class="['ma-options', 'choice-block', choices.kind]" :style="choiceBlockStyle(choices.choices.length)" role="radiogroup">
    <CardZoomBar />
    <label v-for="choice in choices.choices" :key="choice.index" :class="['ma-option', {'ma-option--selected': selected === choice.index}]">
      <input type="radio" class="ma-option-input" :name="groupName" :data-option-index="choice.index" :checked="selected === choice.index" @change="$emit('select', choice.index)">
      <Milestone v-if="choice.milestone !== undefined" :milestone="choice.milestone" :showScores="false" :showDescription="false" />
      <Award v-else-if="choice.award !== undefined" :award="choice.award" :showScores="false" :showDescription="false" />
    </label>
  </div>
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue';
import type {MilestoneAwardChoices} from './milestoneAwardChoice';
import {choiceBlockStyle} from './choiceBlock';
import CardZoomBar from '@/client/wrybit/visuals/cardfilter/CardZoomBar.vue';
import Milestone from '@/client/wrybit/visuals/Milestone.vue';
import Award from '@/client/wrybit/visuals/Award.vue';
import {focusMilestonesAwards} from '@/client/wrybit/visuals/logpanel/milestonesAwardsFocus';

defineProps<{choices: MilestoneAwardChoices, selected: number, groupName: string}>();
defineEmits<{select: [index: number]}>();
let releaseFocus: (() => void) | undefined;
onMounted(() => {
  releaseFocus = focusMilestonesAwards();
});
onBeforeUnmount(() => releaseFocus?.());
</script>
