<template>
<div data-hotkey-group class="wf-component wf-options">
    <InputIntro v-if="binding.showtitle" :input="binding.playerinput" :playerView="binding.playerView"/>
    <div class="resource-options choice-block" :style="choiceBlockStyle(binding.playerinput.include.length)" role="radiogroup">
      <label v-for="unit in binding.playerinput.include" :key="unit" :class="['resource-option', {'resource-option--selected': binding.selected === unit}]">
        <input type="radio" :checked="binding.selected === unit" :value="unit" class="resource-option-input" @change="binding.select(unit)">
        <i :class="'resource_icon resource-option-icon resource_icon--' + unit"></i>
        <span class="resource-option-name">{{ $t(unit) }}</span>
      </label>
    </div>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="nofloat">
        <AppButton hotkey="confirm" @click="binding.save()" :title="binding.playerinput.buttonLabel" :disabled="!binding.canSave"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import InputIntro from './InputIntro.vue';
import type {ResourceBinding} from './presentation';
import {choiceBlockStyle} from './choiceBlock';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';

defineProps<{binding: ResourceBinding}>();
</script>
