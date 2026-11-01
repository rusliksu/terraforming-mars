<template>
  <div class="create-game-segmented" role="radiogroup">
    <button v-for="option in options" :key="String(option.value)" type="button" role="radio"
      :aria-checked="option.value === modelValue" :class="{'create-game-segmented--selected': option.value === modelValue}"
      :disabled="option.disabled" @click="$emit('update:modelValue', option.value)">
      <span v-i18n>{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
export type SegmentOption = {value: string | number, label: string, disabled?: boolean};
defineProps<{options: ReadonlyArray<SegmentOption>, modelValue: string | number}>();
defineEmits<{'update:modelValue': [value: string | number]}>();
</script>
