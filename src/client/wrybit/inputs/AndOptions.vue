<template>
  <div class="wf-options">
    <div v-if="binding.showtitle" class="wf-title">{{ $t(binding.playerinput.title) }}</div>
    <PresentationHost v-for="(host, idx) in binding.childHosts" :key="idx" :hosts="host"/>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="wf-action">
        <AppButton :title="binding.playerinput.buttonLabel" type="submit" size="normal" @click="binding.save()" :disabled="!binding.canSave"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import type {AndOptionsBinding} from './presentation';
import PresentationHost from './PresentationHost.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import AppButton from '@/client/components/common/AppButton.vue';
defineProps<{binding: AndOptionsBinding}>();
</script>
