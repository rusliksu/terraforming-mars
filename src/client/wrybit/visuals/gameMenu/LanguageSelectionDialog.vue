<template>
  <SettingsLanguageDialog :preferencesManager="preferencesManager" @close="$emit('close')" />
</template>
<script setup lang="ts">
import SettingsLanguageDialog from '@/client/wrybit/pages/settings/LanguageSelectionDialog.vue';
import {PreferencesManager} from '@/client/utils/PreferencesManager';
defineProps<{preferencesManager: PreferencesManager}>();
defineEmits<{'close': []}>();
</script>
