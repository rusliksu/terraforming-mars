<template>
  <aside class="wrybit-mode-switch" :data-screen="screen" data-wrybit-shell>
    <button type="button" class="btn" @click="$emit('classic')" v-i18n>Classic layout</button>
  </aside>
</template>

<script setup lang="ts">
defineProps<{screen: string}>();
defineEmits<{classic: []}>();
</script>

<style scoped>
.wrybit-mode-switch {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 30;
}
</style>
