<template>
  <component v-if="partyPresentation !== undefined" :is="partyPresentation" :binding="presentationBinding" />
  <div v-else class="wf-component wf-component--select-party">
    <div v-if="showtitle === true" class="nofloat wf-component-title">{{ $t(playerinput.title) }}</div>
    <div class="wf-component--list-party" v-if="turmoil !== undefined">
      <label v-for="party in turmoil.parties" :key="party.name">
        <input type="radio" v-model="selectedParty" :value="party.name" v-if="partyAvailableToSelect(party.name)">
        <Party :party="party" :isDominant="isDominant(party.name)" :isAvailable="partyAvailableToSelect(party.name)" />
      </label>
    </div>
    <div v-if="showsave === true" class="nofloat">
      <AppButton @click="saveData()" :title="playerinput.buttonLabel" :disabled="selectedParty === undefined" />
    </div>
  </div>
</template>
<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';

import {defineComponent} from 'vue';
import {PartyChoiceBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import {partyCardDetails} from '@/client/components/turmoil/partyCardDetails';
import AppButton from '@/client/components/common/AppButton.vue';
import {SelectPartyModel} from '@/common/models/PlayerInputModel';
import Party from '@/client/components/Party.vue';
import {PartyName} from '@/common/turmoil/PartyName';
import {SelectPartyResponse} from '@/common/inputs/InputResponse';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {TurmoilModel} from '@/common/models/TurmoilModel';

export default defineComponent({
  name: 'SelectParty',
  setup() {
    return {partyPresentation: useInputPresentation('party')};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectPartyModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectPartyResponse) => void,
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
      selectedParty: undefined as PartyName | undefined,
    };
  },
  components: {
    AppButton,
    Party,
  },
  methods: {
    saveData(_attempt?: SaveAttempt, respond?: (response: SelectPartyResponse) => void) {
      const reply = respond ?? this.onsave;
      if (this.selectedParty === undefined) {
        return;
      }
      reply({type: 'party', partyName: this.selectedParty});
    },
    isDominant(partyName: PartyName): boolean {
      return partyName === this.turmoil?.dominant;
    },
    partyAvailableToSelect(partyName: PartyName): boolean {
      if (this.playerinput.parties === undefined) {
        return false;
      } else {
        return this.playerinput.parties.includes(partyName);
      }
    },
  },
  computed: {
    presentationBinding(): PartyChoiceBinding {
      const turmoil = this.turmoil;
      const moreParties = this.playerView.game.gameOptions.expansions.moreParties;
      const betterMars = this.playerView.game.gameOptions.expansions.betterMars;
      return {playerView: this.playerView, playerinput: this.playerinput, showtitle: this.showtitle, showsave: this.showsave,
        turmoil, selected: this.selectedParty,
        cards: turmoil === undefined ? [] : turmoil.parties.map((party) => ({...partyCardDetails(turmoil, party, moreParties, betterMars),
          selected: this.selectedParty === party.name, disabled: !this.partyAvailableToSelect(party.name)})),
        select: (party) => {
          if (this.partyAvailableToSelect(party)) {
            this.selectedParty = party;
          }
        }, save: () => this.saveData()};
    },
    turmoil(): TurmoilModel | undefined {
      return this.playerView.game.turmoil;
    },
  },
});
</script>
