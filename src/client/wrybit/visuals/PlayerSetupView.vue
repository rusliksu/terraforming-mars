<template>
  <div class="player_home_block player_home_block--setup nofloat">
    <CardListSection v-for="section in dealtSections" :key="section.title" :title="section.title" :cards="section.cards"/>
    <CardListSection title="Drafted Cards" :cards="playerView.draftedCards"/>
    <div v-if="playerView.pickedCorporationCard.length === 1" class="setup-picked">
      <div class="or-tabs" role="tablist"><HandCardsTab :count="pickedCards.length" :active="true" label="Your selection"/></div>
      <div v-docked-tab class="or-tab-panel or-tab-panel--view" role="tabpanel">
        <div v-for="card in pickedCards" :key="card.name" class="cardbox"><Card :card="card"/></div>
      </div>
    </div>
    <InputHost v-if="playerView.game.phase !== 'end'">
      <WaitingFor :playerView="playerView" :waitingfor="playerView.waitingFor"/>
    </InputHost>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {Phase} from '@/common/Phase';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import InputHost from '@/client/wrybit/shell/InputHost.vue';
import WaitingFor from '@/client/components/WaitingFor.vue';
import Card from './card/Card.vue';
import CardListSection from './CardListSection.vue';
import HandCardsTab from './HandCardsTab.vue';
import {vDockedTab} from './common/DockedTab';

const props = defineProps<{playerView: PlayerViewModel}>();
const pickedCards = computed(() => [
  ...props.playerView.pickedCorporationCard,
  ...(props.playerView.game.gameOptions.expansions.prelude ? props.playerView.preludeCardsInHand : []),
  ...(props.playerView.game.gameOptions.expansions.ceo ? props.playerView.ceoCardsInHand : []),
  ...props.playerView.cardsInHand,
]);
// Keep our initial-draft visibility until the input tabs also display these cards.
const dealtSections = computed(() => props.playerView.game.phase !== Phase.INITIALDRAFTING || !props.playerView.game.gameOptions.initialDraftVariant ? [] : [
  {title: 'Corporations', cards: props.playerView.dealtCorporationCards},
  {title: 'Prelude cards', cards: props.playerView.dealtPreludeCards},
  {title: 'CEOs', cards: props.playerView.dealtCeoCards},
  {title: 'Project cards', cards: props.playerView.dealtProjectCards},
]);
</script>
