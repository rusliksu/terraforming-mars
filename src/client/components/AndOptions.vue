<template>
  <component v-if="andPresentation !== undefined" :is="andPresentation" :binding="presentationBinding" v-bind="$attrs"/>
  <div v-else class='wf-options' v-bind="$attrs">
    <div v-if="showtitle" class="wf-title">{{ $t(playerinput.title) }}</div>
    <PresentationHost v-for="(host, idx) in childHosts" :key="idx" :hosts="host"/>
    <div v-if="showsave" class="wf-action">
      <AppButton :title="playerinput.buttonLabel" type="submit" size="normal" @click="saveData" :disabled="!canSave()"/>
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
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {AndOptionsModel} from '@/common/models/PlayerInputModel';
import AppButton from '@/client/components/common/AppButton.vue';
import {AndOptionsResponse, InputResponse} from '@/common/inputs/InputResponse';

interface DataModel {
  responded: Array<InputResponse | undefined>,
}

export default defineComponent({
  name: 'AndOptions',
  inheritAttrs: false,
  setup(props) {
    return {andPresentation: useInputPresentation('and'), childHosts: props.playerinput.options.map(() => createInputHosts())};
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
  data(): DataModel {
    return {
      responded: this.playerinput.options.map(() => undefined),
    };
  },
  methods: {
    playerFactorySaved(idx: number) {
      return (out: InputResponse) => {
        this.responded[idx] = out;
      };
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
    saveData() {
      if (this.canSave() === false) {
        alert('Not all options selected');
        return;
      }
      const refs = this.$refs.childInputs as Array<{saveData?: () => void}> | undefined;
      if (refs) {
        for (const child of refs) {
          if (child.saveData instanceof Function) {
            child.saveData();
          }
        }
      }
      this.onsave({
        type: 'and',
        responses: this.responded as Array<InputResponse>,
      });
    },
  },
});

</script>

