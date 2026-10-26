<template>
<div data-hotkey-group class="wf-component wf-component--select-global-event">
    <InputIntro v-if="binding.showtitle" :input="binding.playerinput" :playerView="binding.playerView"/>
    <label v-for="name in binding.playerinput.globalEventNames" :key="name" class="cardBox">
      <input type="radio" :checked="binding.selected === name" :value="name" @change="binding.select(name)">
      <GlobalEvent :globalEventName="name" type="distant"/>
    </label>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="nofloat">
        <AppButton :disabled="binding.selected === undefined" type="submit" hotkey="confirm" @click="binding.save()" title="OK"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import InputIntro from './InputIntro.vue';
import type {GlobalEventBinding} from './presentation';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';

defineProps<{binding: GlobalEventBinding}>();
</script>
