<template>
  <div class="wf-component wf-component--select-option">
    <div v-if="binding.showtitle" class="wf-component-title">{{ $t(binding.playerinput.title) }}</div>
    <WarningsComponent :warnings="binding.playerinput.warnings"/>
    <TabPanelFooterSlot>
      <AppButton v-if="binding.showsave" size="big" @click="binding.save()" :title="$t(binding.playerinput.buttonLabel)"/>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import type {InputViewBinding} from './presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import WarningsComponent from '@/client/components/WarningsComponent.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';

defineProps<{binding: InputViewBinding<'option'>}>();
</script>
