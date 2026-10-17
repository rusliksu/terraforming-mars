<template>
  <div class="amount-converter">
    <AmountSideTile class="amount-converter__from" :side="conversion.from" :before="conversion.from.before"
      :after="conversion.from.before === undefined ? undefined : conversion.from.before - modelValue * conversion.from.perStep"
      :change="modelValue * conversion.from.perStep" direction="loss"/>
    <div class="amount-converter__middle">
      <div class="amount-rate">
        {{ conversion.from.perStep }} <i :class="iconClass(conversion.from)"></i>
        <span class="amount-rate__arrow">→</span>{{ conversion.to.perStep }} <i :class="iconClass(conversion.to)"></i>
      </div>
      <AmountSlider :modelValue="modelValue" :min="min" :max="max" @update:modelValue="$emit('update:modelValue', $event)"/>
    </div>
    <AmountSideTile class="amount-converter__to" :side="conversion.to" :before="conversion.to.before"
      :after="conversion.to.before === undefined ? undefined : conversion.to.before + modelValue * conversion.to.perStep"
      :change="modelValue * conversion.to.perStep" direction="gain"/>
  </div>
</template>

<script setup lang="ts">
import type {AmountPreviewModel, AmountSideModel} from '@/common/models/AmountPreviewModel';
import {cardResourceCSS} from '@/client/components/common/cardResources';
import AmountSideTile from './AmountSideTile.vue';
import AmountSlider from './AmountSlider.vue';

defineProps<{conversion: AmountPreviewModel, modelValue: number, min: number, max: number}>();
defineEmits<{(event: 'update:modelValue', value: number): void}>();
function iconClass(side: AmountSideModel): Array<string> {
  return side.kind === 'card' ? ['amount-rate__icon', 'card-resource', cardResourceCSS[side.resource]] :
    ['amount-rate__icon', 'resource_icon', 'resource_icon--' + side.resource];
}
</script>
