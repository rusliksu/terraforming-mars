<template>
  <div class="card-help-icon" v-show="hovering" @click.stop="open"><a>?</a></div>
  <Teleport to="body">
    <div v-if="showPopup" class="wrybit-ui wrybit-overlay-root">
      <PopupPanel @close="close">
        <template #header><h2>{{ $t(name) }}</h2></template>
        <div class="card-help-text" v-html="renderedHelpText"></div>
      </PopupPanel>
    </div>
  </Teleport>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalCardHelp from '@/client/components/card/CardHelp.vue';
import PopupPanel from '@/client/wrybit/visuals/common/PopupPanel.vue';

export default defineComponent({name: 'CardHelp', extends: CanonicalCardHelp, components: {PopupPanel}});
</script>
