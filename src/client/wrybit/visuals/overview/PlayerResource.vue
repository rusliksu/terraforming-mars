<template>
  <div class="resource-item" :class="mainCSS">
    <div class="resource-item-stock">
      <span class="resource-icon tooltip tooltip-bottom" :class="iconCSS" :data-tooltip="resourceTypeTooltip"></span>
      <div class="resource-item-stock-count" data-test="stock-count">{{ count }}</div>
    </div>
    <div class="resource-item-prod">
      <span class="resource-item-prod-count tooltip tooltip-bottom" data-test="production" :data-tooltip="productionCountTooltip">{{ productionSign }}{{ production }}</span>
      <div class="shield-parent" data-test="protection-shield">
        <div v-if="protectionIcon !== ''" :class="protectionIcon"></div>
        <div v-if="showProductionProtectedIcon" class="shield-production-protection"></div>
        <div v-if="showResourceProtectionIcon" class="shield-resource-protection"></div>
      </div>
      <div v-if="showResourceValue" class="resource-icon--megacredit-value" data-test="resource-value">{{ value }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalPlayerResource from '@/client/components/overview/PlayerResource.vue';

export default defineComponent({name: 'PlayerResource', extends: CanonicalPlayerResource});
</script>
