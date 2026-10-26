<template>
  <component v-if="aresPresentation !== undefined" :is="aresPresentation" :binding="presentationBinding" />
  <div v-else class="wf-component">
    <div v-if="hazardData.erosionOceanCount.available">
        <span v-i18n>Reveal erosions at:</span>&nbsp;
        <label class="form-radio form-inline ares-global-parameter-label" v-for="value in ADJUSTMENT_RANGE" :key='value'>
          <input type="radio" :value="value" name="lowOceanDelta" v-model="lowOceanDelta">
          <i class="form-icon" ></i>
          <div class="ares-global-parameter-option" v-i18n>{{ value + hazardData.erosionOceanCount.threshold }} oceans</div>
        </label>
    </div>

    <div v-if="hazardData.removeDustStormsOceanCount.available">
        <span v-i18n>Remove dust storms at:</span>&nbsp;
        <label class="form-radio form-inline ares-global-parameter-label" v-for="value in ADJUSTMENT_RANGE" :key='value'>
          <input type="radio" :value="value" name="highOceanDelta" v-model="highOceanDelta">
          <i class="form-icon" ></i>
          <div class="ares-global-parameter-option" v-i18n>{{ value + hazardData.removeDustStormsOceanCount.threshold }} oceans</div>
        </label>
    </div>

    <div v-if="hazardData.severeErosionTemperature.available">
        <span v-i18n>Amplify erosions at:</span>&nbsp;
        <label class="form-radio form-inline ares-global-parameter-label" v-for="value in ADJUSTMENT_RANGE" :key='value'>
          <input type="radio" :value="value" name="temperatureDelta" v-model="temperatureDelta">
          <i class="form-icon" ></i>
          <div class="ares-global-parameter-option" v-i18n>{{ (2 * value) + hazardData.severeErosionTemperature.threshold }} °C</div>
        </label>
    </div>

    <div v-if="hazardData.severeDustStormOxygen.available">
        <span v-i18n>Amplify dust storms at:</span>&nbsp;
        <label class="form-radio form-inline ares-global-parameter-label" v-for="value in ADJUSTMENT_RANGE" :key='value'>
          <input type="radio" :value="value" name="oxygenDelta" v-model="oxygenDelta">
          <i class="form-icon" ></i>
          <div class="ares-global-parameter-option" v-i18n>{{ value + hazardData.severeDustStormOxygen.threshold }}% oxygen</div>
        </label>
    </div>

    <div v-if="showsave === true" class="nofloat">
        <button class="btn btn-primary btn-submit" @click="saveData()">{{playerinput.buttonLabel}}</button>
    </div>
</div>
</template>
<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';

import {defineComponent} from 'vue';
import {AresBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import {AresGlobalParametersResponse} from '@/common/inputs/AresGlobalParametersResponse';
import {ShiftAresGlobalParametersModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {ShiftAresGlobalParametersResponse} from '@/common/inputs/InputResponse';
import {HazardData} from '@/common/ares/AresData';

type DataModel = AresGlobalParametersResponse & {
  hazardData: HazardData,
};

export default defineComponent({
  name: 'ShiftAresGlobalParameters',
  setup() {
    return {aresPresentation: useInputPresentation('aresGlobalParameters')};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => ShiftAresGlobalParametersModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: ShiftAresGlobalParametersResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
    },
    showtitle: {
      type: Boolean,
    },
  },
  data(): DataModel {
    const hazardData = this.playerinput.aresData.hazardData;
    return {
      hazardData: hazardData,
      lowOceanDelta: 0,
      highOceanDelta: 0,
      temperatureDelta: 0,
      oxygenDelta: 0,
    };
  },
  methods: {
    saveData(_attempt?: SaveAttempt, respond?: (response: ShiftAresGlobalParametersResponse) => void) {
      const reply = respond ?? this.onsave;
      const response: AresGlobalParametersResponse = {
        lowOceanDelta: this.lowOceanDelta,
        highOceanDelta: this.highOceanDelta,
        temperatureDelta: this.temperatureDelta,
        oxygenDelta: this.oxygenDelta,
      };

      reply({type: 'aresGlobalParameters', response});
    },
  },
  computed: {
    presentationBinding(): AresBinding {
      return {playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        hazardData: this.hazardData, range: this.ADJUSTMENT_RANGE,
        response: {lowOceanDelta: this.lowOceanDelta, highOceanDelta: this.highOceanDelta, temperatureDelta: this.temperatureDelta, oxygenDelta: this.oxygenDelta},
        select: (field, delta) => {
          this[field] = delta;
        }, save: () => this.saveData()};
    },
    ADJUSTMENT_RANGE(): [-1, 0, 1] {
      return [-1, 0, 1];
    },
  },
});
</script>
