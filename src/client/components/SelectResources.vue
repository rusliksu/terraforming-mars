<template>
  <component v-if="resourcesPresentation !== undefined" :is="resourcesPresentation" :binding="presentationBinding" />
  <div v-else class="wf-component wf-options">
    <div v-if="showtitle === true" class="nofloat wf-component-title">{{ $t(playerinput.title) }}</div>
    <template v-for="unit in keys" :key="unit">
      <PaymentUnitComponent
        v-model:count.number="units[unit]"
        :unit="(unit as SpendableResource)"
        :showMax="false"
        description=""
        @plus="addValue(unit)"
        @minus="reduceValue(unit)" />
      <!-- @max="onMaxClicked(unit)" -->
    </template>
    <div v-if="showsave === true" class="nofloat">
      <AppButton @click="saveData()" :title="playerinput.buttonLabel" />
    </div>
  </div>
</template>
<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';

import {defineComponent} from 'vue';
import {UnitAmountsBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import {SelectResourcesModel} from '@/common/models/PlayerInputModel';
import {SelectResourcesResponse} from '@/common/inputs/InputResponse';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {Units} from '@/common/Units';
import {SpendableResource} from '@/common/inputs/Spendable';
import PaymentUnitComponent from '@/client/components/PaymentUnit.vue';
import {sum} from '@/common/utils/utils';

export default defineComponent({
  name: 'SelectResource',
  setup() {
    return {resourcesPresentation: useInputPresentation('resources')};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectResourcesModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectResourcesResponse) => void,
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
      units: {...Units.EMPTY},
    };
  },
  components: {
    AppButton,
    PaymentUnitComponent,
  },
  methods: {
    saveData(_attempt?: SaveAttempt, respond?: (response: SelectResourcesResponse) => void) {
      const reply = respond ?? this.onsave;
      reply({type: 'resources', units: this.units});
    },
    /**
     * Reduce `unit` by one.
     */
    reduceValue(unit: keyof Units): void {
      const currentValue = this.units[unit];
      if (currentValue === undefined) {
        throw new Error(`can not reduceValue for ${unit} on this`);
      }

      const adjustedDelta = Math.min(1, currentValue);
      if (adjustedDelta === 0) {
        return;
      }
      this.units[unit] -= adjustedDelta;
    },
    /**
     * Increase `unit` by one.
     */
    addValue(unit: keyof Units): void {
      const currentValue = this.units[unit];
      if (currentValue === undefined) {
        throw new Error(`can not addValue for ${unit} on this`);
      }

      if (sum(Units.values(this.units)) >= this.playerinput.count) {
        return;
      }

      this.units[unit] += 1;
    },
  },
  computed: {
    presentationBinding(): UnitAmountsBinding<'resources'> {
      return {playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        units: this.units, keys: this.keys, select: (unit, value) => {
          this.units[unit] = value;
        },
        plus: (unit) => this.addValue(unit), minus: (unit) => this.reduceValue(unit), save: () => this.saveData()};
    },
    keys(): typeof Units.keys {
      return Units.keys;
    },
  },
});
</script>
