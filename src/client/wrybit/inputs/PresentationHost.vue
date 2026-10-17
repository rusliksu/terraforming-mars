<template>
  <Teleport v-if="target !== undefined" :to="target" defer><slot></slot></Teleport>
  <div v-else ref="host" v-bind="$attrs" data-input-presentation-host><slot></slot></div>
</template>

<script setup lang="ts">
import {onBeforeUnmount, ref, watch} from 'vue';
import type {InputHosts} from '@/client/wrybit/shell/inputHosts';

defineOptions({inheritAttrs: false});
const props = defineProps<{hosts: InputHosts, target?: HTMLElement}>();
const host = ref<HTMLElement>();
watch([() => props.hosts, () => props.target ?? host.value], ([hosts, target], [previousHosts, previousTarget]) => {
  if (previousTarget !== undefined && previousHosts !== undefined) {
    previousHosts.unregister(previousTarget);
  }
  if (target !== undefined) {
    hosts.register(target);
  }
}, {flush: 'post', immediate: true});
onBeforeUnmount(() => {
  const target = props.target ?? host.value;
  if (target !== undefined) {
    props.hosts.unregister(target);
  }
});
</script>
