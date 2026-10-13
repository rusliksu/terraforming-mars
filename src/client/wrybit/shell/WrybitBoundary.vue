<template>
  <component v-if="enabled && shell !== undefined" :is="shell" :screen="screen" @classic="$emit('classic')" />
  <p v-if="failed" class="wrybit-load-error" role="alert" v-i18n>Wrybit could not be loaded. The classic interface is available.</p>
  <slot></slot>
</template>

<script setup lang="ts">
import {Component, markRaw, ref, shallowRef, watch} from 'vue';

const props = defineProps<{
  enabled: boolean;
  screen: string;
  loadShell?: () => Promise<Component>;
}>();
const emit = defineEmits<{classic: []; active: [value: boolean]}>();
const shell = shallowRef<Component>();
const failed = ref(false);
let pending: Promise<Component> | undefined;
watch(() => props.enabled && shell.value !== undefined, (active) => emit('active', active), {immediate: true});

function loadDefaultShell(): Promise<Component> {
  return import(/* webpackChunkName: "wrybit-ui" */ '@/client/wrybit/shell/WrybitShell.vue').then((module) => module.default);
}

watch(() => props.enabled, async (enabled) => {
  if (!enabled || shell.value !== undefined) {
    return;
  }
  failed.value = false;
  try {
    pending ??= (props.loadShell ?? loadDefaultShell)();
    shell.value = markRaw(await pending);
  } catch {
    pending = undefined;
    if (props.enabled && !failed.value) {
      failed.value = true;
      emit('classic');
    }
  }
}, {immediate: true});
</script>

<style scoped>
.wrybit-load-error {
  padding: 12px;
  margin: 12px;
  border: 1px solid currentColor;
}
</style>
