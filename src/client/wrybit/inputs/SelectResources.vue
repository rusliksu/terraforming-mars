<template>
  <div class="wf-component wf-options">
    <div v-if="binding.showtitle" class="nofloat wf-component-title">{{ $t(binding.playerinput.title) }}</div>
    <PaymentUnit v-for="unit in binding.keys" :key="unit" v-model.number="valueFor(unit).value" :unit="unit" :showMax="false" description=""
      @plus="binding.plus(unit)" @minus="binding.minus(unit)"/>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="nofloat">
        <AppButton @click="binding.save()" :title="binding.playerinput.buttonLabel"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import type {UnitAmountsBinding} from './presentation';
import {useUnitValues} from './unitValues';
import PaymentUnit from '@/client/wrybit/visuals/PaymentUnit.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';

const props = defineProps<{binding: UnitAmountsBinding<'resources'>}>();
const valueFor = useUnitValues(() => props.binding);
</script>
