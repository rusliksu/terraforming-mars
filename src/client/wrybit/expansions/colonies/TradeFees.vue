<template>
  <div class="trade-colony__column trade-colony__column--fees">
    <div class="deal-step__label">{{ $t('You pay') }}</div>
    <div class="trade-colony__fees">
      <button v-for="(option, index) in binding.displayedOptions" :key="index" type="button"
        :class="['trade-colony__fee', {'deal-step__tile--on': binding.selectedIdx === index}]"
        :data-test="'trade-fee-option-' + index" :aria-pressed="binding.selectedIdx === index" @click="binding.select(option)">
        <img :src="'assets/' + FEE_ICON[feeKind(option.title)]" alt="">
        <span class="trade-colony__fee-text"><b>{{ $t(fullTabTitle(option.title)) }}</b></span>
      </button>
      <span v-for="fee in unavailable" :key="fee.resource" class="trade-colony__fee trade-colony__fee--off" :data-test="'trade-fee-off-' + fee.resource">
        <img :src="'assets/' + FEE_ICON[fee.resource]" alt="">
        <span class="trade-colony__fee-text"><b>{{ fee.amount }} {{ $t(fee.resource) }}</b><small>{{ $t('Insufficient stock') }}</small></span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {OrOptionsBinding} from '@/client/wrybit/inputs/presentation';
import {fullTabTitle} from '@/client/wrybit/inputs/orOptionsShortLabels';
import {FEE_ICON, feeKind} from './tradeInput';

const props = defineProps<{binding: OrOptionsBinding}>();
const unavailable = computed(() => props.binding.playerView.thisPlayer.colonyTradeContext?.payments.filter((fee) =>
  !fee.available && !props.binding.displayedOptions.some((option) => feeKind(option.title) === fee.resource)) ?? []);
</script>
