<template>
  <span class="delta-reward" :class="{'delta-reward--done': done}">
    <span v-if="step.vpValue !== undefined" class="track-bonus-chip__vp">{{ step.vpValue }}</span>
    <template v-for="(icon, index) in step.rewardIcons" :key="index">
      <span v-if="icon.or" class="delta-project-board__or">{{ $t('or') }}</span>
      <span v-else-if="icon.separator" class="delta-project-board__separator">/</span>
      <span v-else-if="icon.production" class="delta-project-board__prod-box">
        <span v-for="n in (icon.count || 1)" :key="n" :class="icon.cssClass">{{ icon.text || '' }}</span>
      </span>
      <span v-else-if="icon.asterisk" class="delta-project-board__asterisk">*</span>
      <span v-else :class="icon.cssClass"></span>
    </template>
  </span>
</template>

<script setup lang="ts">
import type {DeltaBoardStep} from '@/client/components/delta/DeltaBoardStep';
defineProps<{step: DeltaBoardStep, done: boolean}>();
</script>
