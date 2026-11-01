<template>
  <component v-if="resourcePresentation !== undefined" :is="resourcePresentation" :binding="presentationBinding" />
  <div v-else class="wf-component wf-options">
    <div v-if="showtitle === true" class="nofloat wf-component-title">{{ $t(playerinput.title) }}</div>
    <div class="form-group">
      <label v-for="included in playerinput.include" :key="included" class="form-inline d-flex align-items-center mb-2">
        <input type="radio" v-model="unit" :value="included" class="form-radio mr-2">
        <i :data-tooltip="included" :class="'resource_icon mr-2 tooltip tooltip-bottom resource_icon--' + included"></i>
        {{ $t(included) }}
      </label>
    </div>
    <div v-if="showsave === true" class="nofloat">
      <AppButton @click="saveData()" :title="playerinput.buttonLabel" />
    </div>
  </div>
</template>
<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';

import {defineComponent} from 'vue';
import {ResourceBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import {SelectResourceModel} from '@/common/models/PlayerInputModel';
import {SelectResourceResponse} from '@/common/inputs/InputResponse';
import {PlayerViewModel} from '@/common/models/PlayerModel';

export default defineComponent({
  name: 'SelectResource',
  setup() {
    return {resourcePresentation: useInputPresentation('resource')};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectResourceModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectResourceResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
    },
    showtitle: {
      type: Boolean,
    },
  },
  data(): {unit: SelectResourceModel['include'][number] | undefined} {
    return {
      unit: undefined,
    };
  },
  components: {
    AppButton,
  },
  computed: {
    presentationBinding(): ResourceBinding {
      return {playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        selected: this.unit, canSave: this.canSave(), select: (unit) => {
          this.unit = unit;
        }, save: () => this.saveData()};
    },
  },
  methods: {
    canSave() {
      return this.unit !== undefined;
    },
    saveData(_attempt?: SaveAttempt, respond?: (response: SelectResourceResponse) => void) {
      const reply = respond ?? this.onsave;
      if (this.unit === undefined) {
        return;
      }
      reply({type: 'resource', resource: this.unit});
    },
  },
});
</script>
