<template>
  <div>
    <InputIntro v-if="binding.showtitle" :input="binding.playerinput" :playerView="binding.playerView"/>
    <DeltaProjectBoard v-if="binding.playerView.game.gameOptions.expansions.deltaProject" :players="binding.playerView.players"/>
    <div class="flex">
      <select class="nes-input" v-model.number="amount">
        <option v-for="step in binding.playerinput.validSteps" :key="step" :value="step">{{ step }}</option>
      </select>
      &nbsp;
      <AppButton size="big" type="max" @click="binding.max()" title="MAX"/>
      &nbsp;
      <AppButton size="big" @click="binding.save()" :title="binding.playerinput.buttonLabel"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import InputIntro from './InputIntro.vue';
import {computed} from 'vue';
import type {DeltaChoiceBinding} from './presentation';
import DeltaProjectBoard from '@/client/components/delta/DeltaProjectBoard.vue';
import AppButton from '@/client/components/common/AppButton.vue';

const props = defineProps<{binding: DeltaChoiceBinding}>();
const amount = computed({get: () => props.binding.amount, set: (value) => props.binding.select(value)});
</script>
