<template>
  <div class="mb-params">
    <div v-for="bar in bars" :key="bar.key" :class="['mb-param', 'mb-param--' + bar.key, {'mb-param--done': bar.done}]">
      <span class="mb-param-label"><img :src="bar.icon" alt=""><span>{{ $t(bar.label) }}</span></span>
      <span class="mb-param-track" :style="{'--steps': bar.steps}" role="meter" :aria-label="$t(bar.label)" :aria-valuemin="bar.min" :aria-valuemax="bar.max" :aria-valuenow="bar.value">
        <span class="mb-param-fill" :style="{'--percent': bar.percent + '%'}"></span>
        <span v-for="(bonus, index) in bar.bonuses" :key="index" :class="['mb-param-bonus', 'mb-param-bonus--' + bonus.kind, {'mb-param-bonus--reached': bar.value >= bonus.at}]"
          :style="{'--percent': bonus.percent + '%'}" :title="$t(bonus.title) + (bonus.amount === undefined ? '' : ' ×' + bonus.amount)">
          <small v-if="bonus.amount !== undefined && bonus.amount !== 1">{{ bonus.amount }}</small>
        </span>
      </span>
      <span class="mb-param-value">{{ bar.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {GlobalParametersConfig} from '@/common/GlobalParameterConfig';
import {parameterBars} from './parameterBars';

const props = defineProps<{temperature: number, oxygen: number, oceans: number, venus?: number, parameters: GlobalParametersConfig}>();
const bars = computed(() => parameterBars(props, props.parameters));
</script>
