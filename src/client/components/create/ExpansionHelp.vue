<template>
  <button ref="trigger" type="button" class="expansion-help-trigger" :aria-label="$t(title)"
    aria-haspopup="dialog" :aria-controls="helpId" :aria-expanded="open" @click.stop.prevent="show">&#9432;</button>
  <Teleport to="body">
    <PopupPanel v-if="open" :id="helpId" class="expansion-help-popup" role="dialog" :aria-modal="true"
      :aria-labelledby="helpId + '-title'" @close="close" @click.self="close" @keydown.tab="trapFocus">
      <template #header>
        <h2 ref="heading" :id="helpId + '-title'" tabindex="-1" v-i18n>{{ title }}</h2>
      </template>
      <slot></slot>
      <a :href="wikiUrl" target="_blank" rel="noopener noreferrer" v-i18n>Learn more</a>
    </PopupPanel>
  </Teleport>
</template>

<script setup lang="ts">
import {nextTick, ref} from 'vue';
import PopupPanel from '@/client/components/common/PopupPanel.vue';

defineProps<{helpId: string; title: string; wikiUrl: string}>();
const open = ref(false);
const trigger = ref<HTMLButtonElement>();
const heading = ref<HTMLHeadingElement>();

async function show() {
  open.value = true;
  await nextTick();
  heading.value?.focus();
}

function close() {
  open.value = false;
  trigger.value?.focus();
}

function trapFocus(event: KeyboardEvent) {
  if (!(event.currentTarget instanceof HTMLElement)) {
    return;
  }
  const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]');
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.value)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
</script>

<style scoped>
.expansion-help-trigger {
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  min-width: 28px;
  min-height: 28px;
  padding: 0 4px;
  cursor: pointer;
}

.expansion-help-trigger:focus-visible {
  outline: 2px solid currentColor;
  border-radius: 4px;
}

.popup-outer.expansion-help-popup :deep(.popup-inner) {
  width: min(90vw, 480px);
  height: auto;
  max-height: 90vh;
  font-size: 14px;
  line-height: 1.5;
}

.expansion-help-popup h2 {
  margin: 0 12px 12px 0;
  font-size: 20px;
}

.expansion-help-popup :deep(.close-button) {
  position: static;
  flex-shrink: 0;
}

.expansion-help-popup :deep(p) {
  margin: 0 0 12px;
}
</style>
