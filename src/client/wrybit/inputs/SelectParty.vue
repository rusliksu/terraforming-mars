<template>
  <div class="wf-component wf-component--select-party select-party">
    <InputIntro v-if="binding.showtitle" :input="binding.playerinput" :playerView="binding.playerView"/>
    <div v-if="binding.turmoil !== undefined" class="select-party__layout">
      <div class="select-party__step">
        <div class="deal-step__label">{{ $t('To which party?') }}</div>
        <div class="select-party__cards">
          <PartyCard v-for="card in binding.cards" :key="card.party.name" :card="card" :turmoil="binding.turmoil"
            :groupName="groupName" @select="binding.select(card.party.name)"/>
        </div>
      </div>
    </div>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="nofloat">
        <AppButton @click="binding.save()" :title="binding.playerinput.buttonLabel" type="submit" size="normal" :disabled="binding.selected === undefined"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import InputIntro from './InputIntro.vue';
import {onBeforeUnmount, onMounted, useId} from 'vue';
import type {PartyChoiceBinding} from './presentation';
import PartyCard from './PartyCard.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import {boardTabState, selectBoardTab} from '@/client/wrybit/visuals/boardTabs/boardTabState';

defineProps<{binding: PartyChoiceBinding}>();
const groupName = useId();
const previousTab = boardTabState.active;
onMounted(() => selectBoardTab('turmoil'));
onBeforeUnmount(() => {
  if (boardTabState.active === 'turmoil') {
    selectBoardTab(previousTab);
  }
});
</script>
