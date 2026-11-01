<template>
  <img class="language-flag" :src="`assets/wrybit/flags/${lang}.svg`" alt="" draggable="false">
</template>

<script setup lang="ts">
// Rectangular flag (assets/flags/<lang>.svg) – replaces the round sprite flags.
// No comment in the template: a single root element, so the caller's class/title are applied.
import type {LANGUAGE} from '@/common/constants';

defineProps<{
  lang: LANGUAGE;
}>();
</script>
