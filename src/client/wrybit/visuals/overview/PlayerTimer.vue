<template>
  <div class="player-timer">
    <template v-if="hasHours">
      <div class="player-timer-hours">{{ hours }}</div><div class="timer-delimiter">:</div>
    </template>
    <div class="player-timer-minutes">{{ minutes }}</div><div class="timer-delimiter">:</div>
    <div class="player-timer-seconds">{{ seconds }}</div>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {Timer} from '@/common/Timer';
import {TimerModel} from '@/common/models/TimerModel';

const props = defineProps<{timer: TimerModel; live?: boolean}>();
function formattedTimer(): string {
  return Timer.toString(props.live ? props.timer : {...props.timer, running: false});
}
const text = ref(formattedTimer());
let intervalId: number | undefined;

function updateTimer() {
  text.value = formattedTimer();
}

function refresh() {
  window.clearInterval(intervalId);
  intervalId = undefined;
  updateTimer();
  if (props.live && props.timer.running) {
    intervalId = window.setInterval(updateTimer, 1000);
  }
}

onMounted(refresh);
watch(() => [props.timer, props.live], refresh);
onBeforeUnmount(() => window.clearInterval(intervalId));
const parts = computed(() => text.value.split(':'));
const hasHours = computed(() => parts.value.length > 2);
const hours = computed(() => hasHours.value ? parts.value[0] : '');
const minutes = computed(() => parts.value[hasHours.value ? 1 : 0]);
const seconds = computed(() => parts.value[hasHours.value ? 2 : 1]);
</script>
