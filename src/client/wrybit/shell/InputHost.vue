<template>
  <div v-if="hosts !== undefined" ref="host" data-player-input-host></div>
  <slot v-else></slot>
</template>

<script setup lang="ts">
import {inject, onBeforeUnmount, onMounted, ref} from 'vue';
import {INPUT_HOSTS} from '@/client/wrybit/shell/inputHosts';

const hosts = inject(INPUT_HOSTS, undefined);
const host = ref<HTMLElement>();
onMounted(() => {
  if (host.value !== undefined) {
    hosts?.register(host.value);
  }
});
onBeforeUnmount(() => {
  if (host.value !== undefined) {
    hosts?.unregister(host.value);
  }
});
</script>
