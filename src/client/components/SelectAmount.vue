<template>
  <component v-if="amountPresentation !== undefined" :is="amountPresentation" :binding="presentationBinding" />
  <div v-else>
    <div v-if="showtitle === true">{{ $t(playerinput.title) }}</div>
    <div class="flex">
      <input type="number" class="nes-input" value="playerinput.min" :min="playerinput.min" :max="playerinput.max" v-model="amount" >
      &nbsp;
      <AppButton size="big" type="max" @click="setMaxValue" title="MAX" />
      &nbsp;
      <AppButton v-if="showsave === true" size="big" @click="saveData()" :title="playerinput.buttonLabel" />
    </div>
  </div>
</template>

<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';

import {defineComponent} from 'vue';
import {AmountBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import {SelectAmountModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {SelectAmountResponse} from '@/common/inputs/InputResponse';

interface DataModel {
  // Why is amount type string?
  amount: string;
}

export default defineComponent({
  name: 'SelectAmount',
  setup() {
    return {amountPresentation: useInputPresentation('amount')};
  },
  components: {
    AppButton,
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectAmountModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectAmountResponse) => void,
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
      amount: this.playerinput.maxByDefault ? String(this.playerinput.max) : String(this.playerinput.min),
    };
  },
  computed: {
    presentationBinding(): AmountBinding {
      return {playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        amount: parseInt(this.amount), select: (value) => {
          this.amount = String(value);
        }, save: () => this.saveData()};
    },
  },
  methods: {
    saveData(_attempt?: SaveAttempt, respond?: (response: SelectAmountResponse) => void) {
      const reply = respond ?? this.onsave;
      reply({type: 'amount', amount: parseInt(this.amount)});
    },
    setMaxValue() {
      this.amount = String(this.playerinput.max);
    },
  },
});
</script>
