<template>
  <div class="resource_item" :class="mainCSS">
    <div class="resource_item_stock">
      <span class="resource_icon tooltip tooltip-bottom" :class="iconCSS" :data-tooltip="resourceTypeTooltip"></span>
      <div class="resource_item_stock_count" data-test="stock-count">{{ count }}</div>
    </div>
    <div class="resource_item_prod">
      <span class="resource_item_prod_count tooltip tooltip-bottom" data-test="production" :data-tooltip="productionCountTooltip">{{ productionSign }}{{ production }}</span>
      <div class="shield_parent" data-test="protection-shield">
        <div v-if="protectionIcon !== ''" :class="protectionIcon"></div>
        <div v-if="showProductionProtectedIcon" class="shield_production_protection"></div>
        <div v-if="showResourceProtectionIcon" class="shield_resource_protection"></div>
      </div>
      <div v-if="showResourceValue" class="resource_icon--megacredit-value" data-test="resource-value">{{ value }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalPlayerResource from '@/client/components/overview/PlayerResource.vue';

export default defineComponent({name: 'PlayerResource', extends: CanonicalPlayerResource});
</script>
