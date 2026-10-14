<template>
  <div class="popup-outer" role="dialog" aria-modal="true">
    <div class="popup-inner">
      <div class="popup-header">
        <slot name="header"></slot>
        <button type="button" class="close-button" @click="onclick" v-i18n>Close</button>
      </div>
      <div class="popup-body"><slot></slot></div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalPopupPanel from '@/client/components/common/PopupPanel.vue';

export default defineComponent({name: 'PopupPanel', extends: CanonicalPopupPanel});
</script>
