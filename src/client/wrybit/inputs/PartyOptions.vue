<template>
  <div data-hotkey-group class="select-party select-party--options" role="radiogroup">
    <div class="select-party__cards" :style="{'--party-columns': Math.min(3, choices.length)}">
      <PartyCard v-for="choice in choices" :key="choice.index" :card="{...choice.card, selected: selected === choice.index, disabled: false}"
        :turmoil="turmoil" :groupName="groupName" :note="choice.stays ? 'Stays here' : undefined" @select="$emit('select', choice.index)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue';
import type {PartyChoice} from './partyChoice';
import type {TurmoilModel} from '@/common/models/TurmoilModel';
import PartyCard from './PartyCard.vue';
import {boardTabState, selectBoardTab} from '@/client/wrybit/visuals/boardTabs/boardTabState';

defineProps<{choices: ReadonlyArray<PartyChoice>, selected: number, groupName: string, turmoil: TurmoilModel}>();
defineEmits<{select: [index: number]}>();
const previousTab = boardTabState.active;
onMounted(() => selectBoardTab('turmoil'));
onBeforeUnmount(() => {
  if (boardTabState.active === 'turmoil') {
    selectBoardTab(previousTab);
  }
});
</script>
