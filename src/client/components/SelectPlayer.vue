<template>
  <div>
    <div v-if="showtitle === true">{{ $t(playerinput.title) }}</div>
    <label v-for="player in (playerinput.players || [])" :key="player" class="form-radio form-inline">
      <input type="radio" v-model="selectedPlayer" :value="player" >
      <i class="form-icon"></i>
      <SelectPlayerRow :player="playerView.players.find((otherPlayer) => otherPlayer.color === player)"/>
    </label>
    <AppButton v-if="showsave === true" size="big" @click="saveData()" :title="$t(playerinput.buttonLabel)" />
  </div>
</template>

<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';


import {defineComponent} from 'vue';
import AppButton from '@/client/components/common/AppButton.vue';
import {SelectPlayerModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import SelectPlayerRow from '@/client/components/SelectPlayerRow.vue';
import {SelectPlayerResponse} from '@/common/inputs/InputResponse';
import {ColorWithNeutral} from '@/common/Color';

type DataModel = {
  selectedPlayer: ColorWithNeutral | undefined;
}

export default defineComponent({
  name: 'SelectPlayer',
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectPlayerModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectPlayerResponse) => void,
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
      selectedPlayer: undefined,
    };
  },
  components: {
    SelectPlayerRow,
    AppButton,
  },
  methods: {
    saveData(_attempt?: SaveAttempt, respond?: (response: SelectPlayerResponse) => void) {
      const reply = respond ?? this.onsave;
      if (this.selectedPlayer === undefined) {
        return;
      }
      reply({type: 'player', player: this.selectedPlayer});
    },
  },
});

</script>
