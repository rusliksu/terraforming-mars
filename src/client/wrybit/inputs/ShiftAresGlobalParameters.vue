<template>
<div data-hotkey-group class="wf-component">
    <div v-if="binding.hazardData.erosionOceanCount.available">
        <span v-i18n>Reveal erosions at:</span>&nbsp;
        <label class="form-radio form-inline ares-global-parameter-label" v-for="value in binding.range" :key='value'>
          <input type="radio" :value="value" name="lowOceanDelta" v-model="valueFor('lowOceanDelta').value">
          <i class="form-icon" ></i>
          <div class="ares-global-parameter-option" v-i18n>{{ value + binding.hazardData.erosionOceanCount.threshold }} oceans</div>
        </label>
    </div>

    <div v-if="binding.hazardData.removeDustStormsOceanCount.available">
        <span v-i18n>Remove dust storms at:</span>&nbsp;
        <label class="form-radio form-inline ares-global-parameter-label" v-for="value in binding.range" :key='value'>
          <input type="radio" :value="value" name="highOceanDelta" v-model="valueFor('highOceanDelta').value">
          <i class="form-icon" ></i>
          <div class="ares-global-parameter-option" v-i18n>{{ value + binding.hazardData.removeDustStormsOceanCount.threshold }} oceans</div>
        </label>
    </div>

    <div v-if="binding.hazardData.severeErosionTemperature.available">
        <span v-i18n>Amplify erosions at:</span>&nbsp;
        <label class="form-radio form-inline ares-global-parameter-label" v-for="value in binding.range" :key='value'>
          <input type="radio" :value="value" name="temperatureDelta" v-model="valueFor('temperatureDelta').value">
          <i class="form-icon" ></i>
          <div class="ares-global-parameter-option" v-i18n>{{ (2 * value) + binding.hazardData.severeErosionTemperature.threshold }} °C</div>
        </label>
    </div>

    <div v-if="binding.hazardData.severeDustStormOxygen.available">
        <span v-i18n>Amplify dust storms at:</span>&nbsp;
        <label class="form-radio form-inline ares-global-parameter-label" v-for="value in binding.range" :key='value'>
          <input type="radio" :value="value" name="oxygenDelta" v-model="valueFor('oxygenDelta').value">
          <i class="form-icon" ></i>
          <div class="ares-global-parameter-option" v-i18n>{{ value + binding.hazardData.severeDustStormOxygen.threshold }}% oxygen</div>
        </label>
    </div>

    <TabPanelFooterSlot>
    <div v-if="binding.showsave" class="nofloat">
        <button class="btn btn-primary btn-submit" data-hotkey="confirm" @click="binding.save()">{{binding.playerinput.buttonLabel}} <HotkeyKeys action="confirm"/></button>
    </div>
    </TabPanelFooterSlot>
</div>
</template>
<script setup lang="ts">
import {computed} from 'vue';
import type {WritableComputedRef} from 'vue';
import type {AresBinding, AresDelta} from './presentation';
import type {AresGlobalParametersResponse} from '@/common/inputs/AresGlobalParametersResponse';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import HotkeyKeys from '@/client/components/hotkeys/HotkeyKeys.vue';

const props = defineProps<{binding: AresBinding}>();
const values = new Map<keyof AresGlobalParametersResponse, WritableComputedRef<AresDelta>>();
function valueFor(field: keyof AresGlobalParametersResponse): WritableComputedRef<AresDelta> {
  let value = values.get(field);
  if (value === undefined) {
    value = computed({get: () => props.binding.response[field], set: (delta) => props.binding.select(field, delta)});
    values.set(field, value);
  }
  return value;
}
</script>
