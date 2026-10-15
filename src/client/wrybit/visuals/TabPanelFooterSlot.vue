<template>
  <!-- In a tab box the content (confirm buttons, payment area) moves into its sticky footer
       (tabPanelFooter.ts, tab_panel_footer.less); outside one it stays in place -->
  <Teleport :to="target" :disabled="target === undefined" :defer="true">
    <slot></slot>
  </Teleport>
</template>

<script setup lang="ts">
import {computed, inject} from 'vue';
import {TAB_PANEL_FOOTER} from './tabPanelFooter';
import {INPUT_FOOTER} from '@/client/wrybit/inputs/presentation';

const legacyTarget = inject(TAB_PANEL_FOOTER, undefined);
const footer = inject(INPUT_FOOTER, undefined);
const target = computed(() => footer?.value ?? legacyTarget);
</script>
