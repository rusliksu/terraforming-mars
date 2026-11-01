<template>
  <component v-if="optionPresentation !== undefined" :is="optionPresentation" :binding="presentationBinding" />
  <div v-else class="wf-component wf-component--select-option">
    <div v-if="showtitle === true" class="wf-component-title">{{ $t(playerinput.title) }}</div>
    <WarningsComponent :warnings="playerinput.warnings" />
    <AppButton v-if="showsave === true" size="big" @click="saveData()" :title="$t(playerinput.buttonLabel)" />
  </div>
</template>

<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';


import {defineComponent} from 'vue';
import {InputViewBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import {SelectOptionModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {SelectOptionResponse} from '@/common/inputs/InputResponse';
import WarningsComponent from './WarningsComponent.vue';

export default defineComponent({
  name: 'SelectOption',
  setup() {
    return {optionPresentation: useInputPresentation('option')};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectOptionModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectOptionResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
    },
    showtitle: {
      type: Boolean,
    },
  },
  components: {
    AppButton,
    WarningsComponent,
  },
  computed: {
    presentationBinding(): InputViewBinding<'option'> {
      return {playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        save: () => this.saveData()};
    },
  },
  methods: {
    saveData(_attempt?: SaveAttempt, respond?: (response: SelectOptionResponse) => void) {
      const reply = respond ?? this.onsave;
      reply({type: 'option'});
    },
  },
});

</script>
