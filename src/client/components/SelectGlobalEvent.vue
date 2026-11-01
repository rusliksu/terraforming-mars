<template>
  <component v-if="eventPresentation !== undefined" :is="eventPresentation" :binding="presentationBinding" />
  <div v-else class="wf-component wf-component--select-global-event">
    <div v-if="showtitle === true" class="nofloat wf-component-title">{{ $t(playerinput.title) }}</div>
    <label v-for="globalEventName in playerinput.globalEventNames" :key="globalEventName" class="cardBox">
      <input type="radio" v-model="selected" :value="globalEventName">
      <GlobalEvent :globalEventName="globalEventName" type="distant" />
    </label>
    <div v-if="showsave === true" class="nofloat">
      <AppButton :disabled="selected === undefined" type="submit" @click="saveData()" title="OK" />
    </div>
  </div>
</template>

<script lang="ts">
import type {SaveAttempt} from '@/client/wrybit/inputs/saveAttempt';


import {defineComponent} from 'vue';
import {GlobalEventBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import {SelectGlobalEventModel} from '@/common/models/PlayerInputModel';
import {SelectGlobalEventResponse} from '@/common/inputs/InputResponse';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';

type DataModel = {
  selected: GlobalEventName | undefined;
};

export default defineComponent({
  name: 'SelectGlobalEvent',
  setup() {
    return {eventPresentation: useInputPresentation('globalEvent')};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectGlobalEventModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectGlobalEventResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
      required: false,
      default: false,
    },
    showtitle: {
      type: Boolean,
    },
  },
  data(): DataModel {
    return {
      selected: undefined,
    };
  },
  components: {
    GlobalEvent,
    AppButton,
  },
  computed: {
    presentationBinding(): GlobalEventBinding {
      return {playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        selected: this.selected, select: (name) => {
          this.selected = name;
        }, save: () => this.saveData()};
    },
  },
  methods: {
    saveData(_attempt?: SaveAttempt, respond?: (response: SelectGlobalEventResponse) => void) {
      const reply = respond ?? this.onsave;
      if (this.selected === undefined) {
        throw new Error('Select a global event');
      }
      reply({type: 'globalEvent', globalEventName: this.selected});
    },
  },
});

</script>
