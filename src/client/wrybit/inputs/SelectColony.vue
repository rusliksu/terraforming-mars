<template>
  <div class="wf-component wf-component--select-card choice-block" :style="choiceBlockStyle(binding.colonies.length)">
    <div v-if="binding.showtitle" class="nofloat wf-component-title">{{ $t(binding.playerinput.title) }}</div>
    <label v-for="colony in binding.colonies" :key="colony.model.name"
      :class="['choice-option', 'colony-choice', {'choice-option--selected': binding.selected === colony.model.name}]"
      :data-test="'colony-choice-' + colony.model.name">
      <input type="radio" class="choice-option-input" :checked="binding.selected === colony.model.name" :value="colony.model.name" @change="binding.select(colony.model.name)">
      <ColonyPlanet class="colony-choice__planet" :name="colony.model.name"/>
      <b class="colony-choice__name">{{ $t(colony.model.name) }}</b>
      <span class="colony-choice__slots">
        <template v-for="slot in 3" :key="slot">
          <PlayerCube v-if="colony.model.colonies[slot - 1] !== undefined" :color="colony.model.colonies[slot - 1]" view="slight" :size="11"/>
          <i v-else class="colony-choice__slot"></i>
        </template>
      </span>
      <small class="colony-choice__gain"><b>{{ $t('Build Colony bonus') }}:</b> {{ $t(colony.metadata.build.description) }}</small>
      <small class="colony-choice__gain"><b>{{ $t('Trade bonus') }}:</b> {{ $t(colony.metadata.trade.description) }}</small>
      <small class="colony-choice__gain"><b>{{ $t('Colony bonus') }}:</b> {{ $t(colony.metadata.colony.description) }}</small>
    </label>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="nofloat">
        <AppButton @click="binding.save()" :title="binding.playerinput.buttonLabel" type="submit" size="normal" :disabled="!binding.canSave"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue';
import type {ColonyChoiceBinding} from './presentation';
import {choiceBlockStyle} from './choiceBlock';
import ColonyPlanet from './colony/ColonyPlanet.vue';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import {boardTabState, selectBoardTab} from '@/client/wrybit/visuals/boardTabs/boardTabState';

const props = defineProps<{binding: ColonyChoiceBinding}>();
const previousTab = boardTabState.active;
onMounted(() => {
  if (props.binding.playerView.game.colonies.some((model) => props.binding.colonies.some((colony) => colony.model.name === model.name))) {
    selectBoardTab('colonies');
  }
});
onBeforeUnmount(() => {
  if (boardTabState.active === 'colonies') {
    selectBoardTab(previousTab);
  }
});
</script>
