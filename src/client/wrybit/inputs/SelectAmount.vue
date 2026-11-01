<template>
  <div class="amount-select">
    <CardIntroBlock v-if="binding.playerinput.preview !== undefined" :card="binding.playerinput.preview.sourceCard" :title="binding.playerinput.title" />
    <div v-else-if="binding.showtitle" class="amount-select__title">{{ $t(binding.playerinput.title) }}</div>
    <div v-if="binding.playerinput.preview !== undefined" class="choice-block choice-block--natural">
      <AmountConverter :modelValue="binding.amount" :conversion="binding.playerinput.preview"
        :min="binding.playerinput.min" :max="binding.playerinput.max" @update:modelValue="binding.select($event)" />
    </div>
    <div v-else class="amount-slider-plain">
      <AmountSlider :modelValue="binding.amount" :min="binding.playerinput.min" :max="binding.playerinput.max" @update:modelValue="binding.select($event)" />
    </div>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="amount-select__actions">
        <AppButton type="submit" hotkey="confirm" @click="binding.save()" :title="$t(binding.playerinput.buttonLabel) + ' ' + binding.amount" />
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import type {AmountBinding} from './presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import AmountSlider from './amount/AmountSlider.vue';
import AmountConverter from './amount/AmountConverter.vue';
import CardIntroBlock from './CardIntroBlock.vue';

// Source slider view; initial amount, range and response belong to our controller.
defineProps<{binding: AmountBinding}>();
</script>
