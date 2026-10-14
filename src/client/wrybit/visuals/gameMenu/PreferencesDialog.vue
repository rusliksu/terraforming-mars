<template>
  <DialogFrame :title="$t('Player Settings')" :width="520" @close="$emit('okButtonClicked')">
    <PreferencesDialog :preferencesManager="preferencesManager" @okButtonClicked="$emit('okButtonClicked')"/>
  </DialogFrame>
</template>
<script setup lang="ts">
import DialogFrame from '@/client/wrybit/visuals/DialogFrame.vue';
import PreferencesDialog from '@/client/components/PreferencesDialog.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
defineProps<{preferencesManager: PreferencesManager}>();
defineEmits<{'okButtonClicked': []}>();
</script>
