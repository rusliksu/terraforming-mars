<template>
  <div class="wf-component">
    <div v-if="hazardData.erosionOceanCount.available">
      <span v-i18n>Reveal erosions at:</span>&nbsp;
      <label class="form-radio form-inline ares-global-parameter-label" v-for="value in ADJUSTMENT_RANGE" :key="value">
        <input type="radio" :value="value" name="lowOceanDelta" v-model="lowOceanDelta">
        <i class="form-icon"></i>
        <div class="ares-global-parameter-option" v-i18n>{{ value + hazardData.erosionOceanCount.threshold }} oceans</div>
      </label>
    </div>

    <div v-if="hazardData.removeDustStormsOceanCount.available">
      <span v-i18n>Remove dust storms at:</span>&nbsp;
      <label class="form-radio form-inline ares-global-parameter-label" v-for="value in ADJUSTMENT_RANGE" :key="value">
        <input type="radio" :value="value" name="highOceanDelta" v-model="highOceanDelta">
        <i class="form-icon"></i>
        <div class="ares-global-parameter-option" v-i18n>{{ value + hazardData.removeDustStormsOceanCount.threshold }} oceans</div>
      </label>
    </div>

    <div v-if="hazardData.severeErosionTemperature.available">
      <span v-i18n>Amplify erosions at:</span>&nbsp;
      <label class="form-radio form-inline ares-global-parameter-label" v-for="value in ADJUSTMENT_RANGE" :key="value">
        <input type="radio" :value="value" name="temperatureDelta" v-model="temperatureDelta">
        <i class="form-icon"></i>
        <div class="ares-global-parameter-option" v-i18n>{{ (2 * value) + hazardData.severeErosionTemperature.threshold }} °C</div>
      </label>
    </div>

    <div v-if="hazardData.severeDustStormOxygen.available">
      <span v-i18n>Amplify dust storms at:</span>&nbsp;
      <label class="form-radio form-inline ares-global-parameter-label" v-for="value in ADJUSTMENT_RANGE" :key="value">
        <input type="radio" :value="value" name="oxygenDelta" v-model="oxygenDelta">
        <i class="form-icon"></i>
        <div class="ares-global-parameter-option" v-i18n>{{ value + hazardData.severeDustStormOxygen.threshold }}% oxygen</div>
      </label>
    </div>

    <TabPanelFooterSlot>
      <div v-if="showsave === true" class="nofloat">
        <button class="btn btn-primary btn-submit" @click="saveData()">{{ playerinput.buttonLabel }}</button>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>
<script lang="ts">
import {defineComponent} from 'vue';
import Canonical from '@/client/components/ShiftAresGlobalParameters.vue';
import TabPanelFooterSlot from './TabPanelFooterSlot.vue';
export default defineComponent({name: 'ShiftAresGlobalParameters', extends: Canonical, components: {TabPanelFooterSlot}});
</script>
