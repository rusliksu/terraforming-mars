<template>
  <div :hidden="target === undefined" data-input-fallback>
    <Teleport :to="target" :disabled="target === undefined"><slot></slot></Teleport>
  </div>
</template>

<script setup lang="ts">
defineProps<{target?: HTMLElement}>();
</script>
