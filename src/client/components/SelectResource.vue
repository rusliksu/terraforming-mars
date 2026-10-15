<template>
  <div class="wf-component wf-options">
    <div v-if="showtitle === true" class="nofloat wf-component-title">{{ $t(playerinput.title) }}</div>
    <div class="form-group">
      <label v-for="included in playerinput.include" :key="included" v-trim-whitespace class="form-inline d-flex align-items-center mb-2">
          <input type="radio" v-model="unit" :value="included" class="form-radio mr-2" >
          <i :data-tooltip="included" :class="'resource_icon mr-2 tooltip tooltip-bottom resource_icon--' + included" ></i>
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
import AppButton from '@/client/components/common/AppButton.vue';
import {SelectResourceModel} from '@/common/models/PlayerInputModel';
import {SelectResourceResponse} from '@/common/inputs/InputResponse';
import {PlayerViewModel} from '@/common/models/PlayerModel';

export default defineComponent({
  name: 'SelectResource',
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
  data() {
    return {
      unit: undefined,
    };
  },
  components: {
    AppButton,
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
