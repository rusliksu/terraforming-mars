<template>
  <component v-if="deltaPresentation !== undefined" :is="deltaPresentation" :binding="presentationBinding" />
  <div v-else>
    <div v-if="showtitle === true">{{ $t(playerinput.title) }}</div>
    <DeltaProjectBoard
      v-if="playerView.game.gameOptions.expansions.deltaProject"
      :players="playerView.players"
    />
    <div class="flex">
      <select class="nes-input" v-model.number="amount">
        <option v-for="s in playerinput.validSteps" :key="s" :value="s">{{ s }}</option>
      </select>
      &nbsp;
      <AppButton size="big" type="max" @click="setMaxValue" title="MAX" />
      &nbsp;
      <AppButton size="big" @click="saveData()" :title="playerinput.buttonLabel" />
    </div>
  </div>
</template>

<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';

import {defineComponent} from 'vue';
import {DeltaChoiceBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import DeltaProjectBoard from '@/client/components/delta/DeltaProjectBoard.vue';
import {DeltaProjectInputModel} from '@/common/models/PlayerInputModel';
import {DeltaProjectInputResponse} from '@/common/inputs/InputResponse';
import {PlayerViewModel} from '@/common/models/PlayerModel';

export default defineComponent({
  name: 'DeltaProjectInput',
  setup() {
    return {deltaPresentation: useInputPresentation('deltaProject')};
  },
  components: {
    AppButton,
    DeltaProjectBoard,
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => DeltaProjectInputModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: DeltaProjectInputResponse) => void,
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
      amount: this.playerinput.validSteps[0],
    };
  },
  computed: {
    presentationBinding(): DeltaChoiceBinding {
      return {playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        amount: this.amount, select: (amount) => {
          this.amount = amount;
        }, max: () => this.setMaxValue(), save: () => this.saveData()};
    },
  },
  methods: {
    saveData(_attempt?: SaveAttempt, respond?: (response: DeltaProjectInputResponse) => void) {
      const reply = respond ?? this.onsave;
      reply({type: 'deltaProject', amount: this.amount});
    },
    setMaxValue() {
      const steps = this.playerinput.validSteps;
      this.amount = steps[steps.length - 1] ?? 1;
    },
  },
});
</script>
