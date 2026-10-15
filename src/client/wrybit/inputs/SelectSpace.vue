<template>
  <div class="select_space_cont">
    <SpaceConfirmPopover :anchor="binding.anchor" @accept="binding.accept()" @dismiss="binding.dismiss()" @hide="binding.hide($event)"/>
    <div v-if="binding.showtitle" class="wf-select-space">
      {{ $t(binding.playerinput.title) }}
      <GoToMap :playerinput="binding.playerinput"/>
    </div>
    <div v-if="binding.warning" class="nes-container is-rounded">
      <span class="nes-text is-warning" v-i18n>{{ binding.warning }}</span>
      <GoToMap :playerinput="binding.playerinput"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {SpaceBinding} from './presentation';
import SpaceConfirmPopover from '@/client/wrybit/visuals/SpaceConfirmPopover.vue';
import GoToMap from '@/client/components/waitingFor/GoToMap.vue';

defineProps<{binding: SpaceBinding}>();
</script>
