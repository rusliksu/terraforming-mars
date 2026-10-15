<template>
  <component v-if="andPresentation !== undefined" :is="andPresentation" :binding="presentationBinding" v-bind="$attrs"/>
  <div v-else class='wf-options' v-bind="$attrs">
    <div v-if="showtitle" class="wf-title">{{ $t(playerinput.title) }}</div>
    <PresentationHost v-for="(host, idx) in childHosts" :key="idx" :hosts="host"/>
    <div v-if="showsave" class="wf-action">
      <AppButton :title="playerinput.buttonLabel" type="submit" size="normal" @click="saveData()" :disabled="!canSave()"/>
    </div>
  </div>
  <InputPortal v-for="(option, idx) in playerinput.options" :key="idx" :target="childHosts[idx].target.value">
    <PlayerInputFactory ref="childInputs" :playerView="playerView" :playerinput="option"
      :onsave="playerFactorySaved(idx)" :showsave="false" :showtitle="true"/>
  </InputPortal>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {createInputHosts} from '@/client/wrybit/shell/inputHosts';
import InputPortal from '@/client/wrybit/shell/InputPortal.vue';
import PresentationHost from '@/client/wrybit/inputs/PresentationHost.vue';
import {AndOptionsBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import {afterSave, useSaveSession, withSaveAttempt} from '@/client/wrybit/inputs/saveAttempt';
import type {InputCollector, MaybePromise, SaveAttempt, SaveOutcome} from '@/client/wrybit/inputs/saveAttempt';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {AndOptionsModel} from '@/common/models/PlayerInputModel';
import AppButton from '@/client/components/common/AppButton.vue';
import {AndOptionsResponse, InputResponse} from '@/common/inputs/InputResponse';

export default defineComponent({
  name: 'AndOptions',
  inheritAttrs: false,
  setup(props) {
    return {andPresentation: useInputPresentation('and'), childHosts: props.playerinput.options.map(() => createInputHosts()), saveSession: useSaveSession()};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => AndOptionsModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: AndOptionsResponse) => void,
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
    InputPortal,
    PresentationHost,
  },
  computed: {
    presentationBinding(): AndOptionsBinding {
      return {playerView: this.playerView, playerinput: this.playerinput, showtitle: this.showtitle, showsave: this.showsave,
        childHosts: this.childHosts, canSave: this.canSave(), save: () => this.saveData()};
    },
  },
  methods: {
    playerFactorySaved(_idx: number) {
      // A child may update independently; only collectResponse commits an aggregate.
      return (_out: InputResponse) => {};
    },
    canSave(): boolean {
      const refs = this.$refs.childInputs as Array<{canSave?: () => boolean}> | undefined;
      if (!refs) {
        return true;
      }
      for (const child of refs) {
        if (child.canSave instanceof Function) {
          if (child.canSave() === false) {
            return false;
          }
        }
      }
      return true;
    },
    saveData(attempt?: SaveAttempt, respond?: (response: AndOptionsResponse) => void): MaybePromise<SaveOutcome> {
      const reply = respond ?? this.onsave;
      return withSaveAttempt(this.saveSession, attempt, (current) => {
        if (this.canSave() === false) {
          alert('Not all options selected');
          return 'invalid';
        }
        const refs = this.$refs.childInputs as Array<InputCollector> | undefined;
        if ((refs?.length ?? 0) !== this.playerinput.options.length) {
          return 'invalid';
        }
        const responses: Array<InputResponse> = [];
        const collect = (index: number): MaybePromise<SaveOutcome> => {
          if (!current.isCurrent()) {
            return 'cancelled';
          }
          if (index === this.playerinput.options.length) {
            reply({type: 'and', responses});
            return 'saved';
          }
          const child = refs?.[index];
          if (child === undefined) {
            return 'invalid';
          }
          return afterSave(child.collectResponse(current), (collected) => {
            if (collected.outcome !== 'saved') {
              return collected.outcome;
            }
            responses.push(collected.response);
            return collect(index + 1);
          });
        };
        return collect(0);
      });
    },
  },
});

</script>

