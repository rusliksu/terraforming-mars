<template>
  <SettingsPreferencesDialog :preferencesManager="preferencesManager" @okButtonClicked="$emit('okButtonClicked')" />
</template>
<script setup lang="ts">
import SettingsPreferencesDialog from '@/client/wrybit/pages/settings/PreferencesDialog.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
defineProps<{preferencesManager: PreferencesManager}>();
defineEmits<{'okButtonClicked': []}>();
</script>
