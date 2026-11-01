<template>
  <div data-hotkey-group>
    <InputIntro v-if="binding.showtitle" :input="binding.playerinput" :playerView="binding.playerView" />
    <div class="player-options choice-block" :style="choiceBlockStyle((binding.playerinput.players || []).length)" role="radiogroup">
      <PlayerOptionTile v-for="color in binding.playerinput.players" :key="color" :color="color"
        :player="binding.playerView.players.find((other) => other.color === color)" :selected="binding.selected === color"
        :groupName="groupName" @select="binding.select($event)" />
    </div>
    <TabPanelFooterSlot>
      <AppButton v-if="binding.showsave" size="big" hotkey="confirm" @click="binding.save()" :title="$t(binding.playerinput.buttonLabel)" />
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import InputIntro from './InputIntro.vue';
import {useId} from 'vue';
import type {PlayerChoiceBinding} from './presentation';
import {choiceBlockStyle} from './choiceBlock';
import PlayerOptionTile from './PlayerOptionTile.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';

defineProps<{binding: PlayerChoiceBinding}>();
const groupName = useId();
</script>
