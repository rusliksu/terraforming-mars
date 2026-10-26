<template>
  <AppButton v-for="action in undo?.actions ?? []" :key="action.mode" class="cancel-action-button" :data-undo-mode="action.mode"
    hotkey="undo" :title="action.title" @click="undo?.run(action.mode)"/>
</template>

<script setup lang="ts">
import {inject} from 'vue';
import AppButton from '@/client/components/common/AppButton.vue';
import {WAITING_UNDO} from './undoPresentation';

const undo = inject(WAITING_UNDO, undefined);
</script>
