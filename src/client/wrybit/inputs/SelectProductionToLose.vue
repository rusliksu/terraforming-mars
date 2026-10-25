<template>
  <div class="wf-component wf-component--select-production-to-lose">
    <InputIntro v-if="binding.showtitle" :input="binding.playerinput" :playerView="binding.playerView"/>
    <h3 v-if="binding.playerinput.warning !== undefined" class="payments_title">{{ $t(binding.playerinput.warning) }}</h3>
    <div class="payments_type input-group" v-for="unit in binding.keys" :key="unit" :data-unit="unit">
      <div class="production-box"><div :class="['production', unit === 'megacredits' ? 'resource_icon--megacredits' : unit]" :style="unit === 'megacredits' ? 'background-size:contain;' : ''"></div></div>
      <button class="btn btn-primary" @click="binding.minus(unit)"><i class="icon icon-minus"></i></button>
      <input class="form-input form-inline payments_input" v-model.number="valueFor(unit).value">
      <button class="btn btn-primary" @click="binding.plus(unit)"><i class="icon icon-plus"></i></button>
    </div>
    <div v-if="binding.warning !== undefined" class="tm-warning">
      <label class="label label-error">{{ $t(binding.warning) }}</label>
    </div>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="nofloat">
        <button class="btn btn-primary btn-submit" @click="binding.save()">{{ $t(binding.playerinput.buttonLabel) }}</button>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import InputIntro from './InputIntro.vue';
import type {UnitAmountsBinding} from './presentation';
import {useUnitValues} from './unitValues';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';

const props = defineProps<{binding: UnitAmountsBinding<'productionToLose'>}>();
const valueFor = useUnitValues(() => props.binding);
</script>
