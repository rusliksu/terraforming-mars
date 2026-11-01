<template>
  <div class="player-status">
    <div class="player-status-bottom">
      <div :class="getLabelAndTimerClasses()">
        <div v-if="actionLabel !== 'researching'" :class="getActionStatusClasses()"><span v-i18n>{{ actionLabel }}</span></div>
        <div v-if="showTimer" class="player-status-timer"><PlayerTimer :timer="timer" :live="liveTimer" /></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalPlayerStatus from '@/client/components/overview/PlayerStatus.vue';
import PlayerTimer from './PlayerTimer.vue';

export default defineComponent({name: 'PlayerStatus', extends: CanonicalPlayerStatus, components: {PlayerTimer}});
</script>
