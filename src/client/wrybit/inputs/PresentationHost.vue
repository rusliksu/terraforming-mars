<template><div ref="host" data-input-presentation-host></div></template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import type {InputHosts} from '@/client/wrybit/shell/inputHosts';

const props = defineProps<{hosts: InputHosts}>();
const host = ref<HTMLElement>();
onMounted(() => {
  if (host.value !== undefined) {
    props.hosts.register(host.value);
  }
});
onBeforeUnmount(() => {
  if (host.value !== undefined) {
    props.hosts.unregister(host.value);
  }
});
</script>
