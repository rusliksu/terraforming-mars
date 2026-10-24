<template>
  <div class="wf-component wf-options">
    <InputIntro v-if="binding.showtitle" :input="binding.playerinput" :playerView="binding.playerView"/>
    <PaymentUnit v-for="unit in binding.keys" :key="unit" v-model:count.number="valueFor(unit).value" :unit="unit" :showMax="false" description=""
      @plus="binding.plus(unit)" @minus="binding.minus(unit)"/>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="nofloat">
        <AppButton @click="binding.save()" :title="binding.playerinput.buttonLabel"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import InputIntro from './InputIntro.vue';
import type {UnitAmountsBinding} from './presentation';
import {useUnitValues} from './unitValues';
import PaymentUnit from '@/client/wrybit/visuals/PaymentUnit.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';

const props = defineProps<{binding: UnitAmountsBinding<'resources'>}>();
const valueFor = useUnitValues(() => props.binding);
</script>
