<template>
  <component v-if="undergroundPresentation !== undefined" :is="undergroundPresentation" :binding="presentationBinding" />
  <div v-else class="wf-component wf-options">
    <div v-if="showtitle === true" class="nofloat wf-component-title">{{ $t(playerinput.title) }}</div>
    <div class="underground-tokens">
      <label v-for="(token, idx) in playerinput.tokens" :key="idx">
         <!-- disabled="selected.length >= playerinput.count -->
        <input type="checkbox" :name="String(idx)" v-model="selected" :value="idx" >
        <UndergroundToken
          :token="token"
          :key="idx"
          location="tag-count"
          />
          <br>
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
import {UndergroundChoiceBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import {SelectClaimedUndergroundTokenModel} from '@/common/models/PlayerInputModel';
import {SelectClaimedUndergroundTokenResponse} from '@/common/inputs/InputResponse';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import UndergroundToken from '@/client/components/underworld/UndergroundToken.vue';

type DataModel = {
  selected: Array<number>,
};

export default defineComponent({
  name: 'SelectClaimedUndergroundToken',
  setup() {
    return {undergroundPresentation: useInputPresentation('claimedUndergroundToken')};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectClaimedUndergroundTokenModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectClaimedUndergroundTokenResponse) => void,
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
      selected: [],
    };
  },
  components: {
    AppButton,
    UndergroundToken,
  },
  computed: {
    presentationBinding(): UndergroundChoiceBinding {
      return {playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        selected: this.selected, select: (indices) => {
          this.selected = indices;
        }, save: () => this.saveData()};
    },
  },
  methods: {
    canSave() {
      if (this.selected.length > this.playerinput.max) {
        return false;
      }
      if (this.selected.length < this.playerinput.min) {
        return false;
      }
      return true;
    },
    saveData(_attempt?: SaveAttempt, respond?: (response: SelectClaimedUndergroundTokenResponse) => void) {
      const reply = respond ?? this.onsave;
      reply({type: 'claimedUndergroundToken', selected: this.selected});
    },
  },
});
</script>
