<template>
  <label :class="['choice-option', {'choice-option--selected': selected}]">
    <input type="radio" :name="groupName" :checked="selected" class="choice-option-input" @change="$emit('select')">
    <span>{{ $t(title) }}</span>
  </label>
</template>

<script setup lang="ts">
import type {Message} from '@/common/logs/Message';

// Resource forecasts require native facts; no source title-to-rule inference is imported.
defineProps<{title: string | Message, selected: boolean, groupName: string}>();
defineEmits<{select: []}>();
</script>
