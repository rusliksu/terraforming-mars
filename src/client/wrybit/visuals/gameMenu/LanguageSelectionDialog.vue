<template>
  <DialogFrame :title="$t('Language')" :width="520" @close="$emit('close')">
    <LanguageSelectionDialog :preferencesManager="preferencesManager"/>
  </DialogFrame>
</template>
<script setup lang="ts">
import DialogFrame from '@/client/wrybit/visuals/DialogFrame.vue';
import LanguageSelectionDialog from '@/client/components/LanguageSelectionDialog.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
defineProps<{preferencesManager: PreferencesManager}>();
defineEmits<{'close': []}>();
</script>
