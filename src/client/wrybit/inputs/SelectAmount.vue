<template>
  <div class="amount-select">
    <div v-if="binding.showtitle" class="amount-select__title">{{ $t(binding.playerinput.title) }}</div>
    <div class="amount-slider-plain">
      <AmountSlider :modelValue="binding.amount" :min="binding.playerinput.min" :max="binding.playerinput.max" @update:modelValue="binding.select($event)"/>
    </div>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="amount-select__actions">
        <AppButton type="submit" @click="binding.save()" :title="$t(binding.playerinput.buttonLabel) + ' ' + binding.amount"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import type {AmountBinding} from './presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import AmountSlider from './amount/AmountSlider.vue';

// Source slider view; initial amount, range and response belong to our controller.
defineProps<{binding: AmountBinding}>();
</script>
