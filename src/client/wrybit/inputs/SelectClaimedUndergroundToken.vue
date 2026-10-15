<template>
  <div class="wf-component wf-options">
    <div v-if="binding.showtitle" class="nofloat wf-component-title">{{ $t(binding.playerinput.title) }}</div>
    <div class="underground-tokens choice-block choice-block--natural">
      <label v-for="(token, idx) in binding.playerinput.tokens" :key="idx">
        <input type="checkbox" :name="String(idx)" v-model="selected" :value="idx">
        <UndergroundToken :token="token" location="tag-count"/>
        <br>
      </label>
    </div>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="nofloat">
        <AppButton @click="binding.save()" :title="binding.playerinput.buttonLabel"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {UndergroundChoiceBinding} from './presentation';
import UndergroundToken from '@/client/components/underworld/UndergroundToken.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';

const props = defineProps<{binding: UndergroundChoiceBinding}>();
const selected = computed({get: () => [...props.binding.selected], set: (indices) => props.binding.select(indices)});
</script>
