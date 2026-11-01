<template>
  <component v-if="colonyPresentation !== undefined" :is="colonyPresentation" :binding="presentationBinding" />
  <div v-else class="wf-component wf-component--select-card">
    <div v-if="showtitle === true" class="nofloat wf-component-title">{{ $t(playerinput.title) }}</div>
    <label v-for="colony in (playerinput.coloniesModel || [])" class="cardbox" :key="colony.name">
      <input type="radio" v-model="selectedColony" :value="colony.name">
      <Colony :colony="colony" :fadeMarker="playerinput.buttonLabel === 'Build'" />
    </label>
    <div v-if="showsave === true" class="nofloat">
      <AppButton @click="saveData()" :title="playerinput.buttonLabel" :disabled="!canSave()" />
    </div>
  </div>
</template>
<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';

import {defineComponent} from 'vue';
import {ColonyChoiceBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import {getColonyOrThrow} from '@/client/colonies/ClientColonyManifest';
import Colony from '@/client/components/colonies/Colony.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import {SelectColonyModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {SelectColonyResponse} from '@/common/inputs/InputResponse';
import {ColonyName} from '@/common/colonies/ColonyName';

type DataModel = {
  selectedColony: ColonyName | undefined,
};

export default defineComponent({
  name: 'SelectColony',
  setup() {
    return {colonyPresentation: useInputPresentation('colony')};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectColonyModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectColonyResponse) => void,
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
    return {
      selectedColony: undefined,
    };
  },
  components: {
    Colony,
    AppButton,
  },
  computed: {
    presentationBinding(): ColonyChoiceBinding {
      return {playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        colonies: (this.playerinput.coloniesModel ?? []).map((model) => ({model, metadata: getColonyOrThrow(model.name)})),
        selected: this.selectedColony, canSave: this.canSave(), select: (name) => {
          this.selectedColony = name;
        }, save: () => this.saveData()};
    },
  },
  methods: {
    canSave() {
      return this.selectedColony !== undefined;
    },
    saveData(_attempt?: SaveAttempt, respond?: (response: SelectColonyResponse) => void) {
      const reply = respond ?? this.onsave;
      if (this.selectedColony !== undefined) {
        reply({type: 'colony', colonyName: this.selectedColony});
      }
    },
  },
});
</script>
