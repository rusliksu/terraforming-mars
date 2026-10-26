<template>
<div data-hotkey-group class="actions-tab-sections">
    <CardFilterBar :cards="cards" :filter="playedCardFilter" :context="filterContext">
      <template #sort="{compact}"><CardSortMenu v-model="playedCardsSortOrder" :compact="compact"/></template>
    </CardFilterBar>
    <section v-for="section in sections" :key="section.index" class="hand-cards-panel__section">
      <h3 v-if="sections.length > 1" class="hand-cards-panel__title">{{ $t(section.title) }} <small>{{ section.cards.length }}</small></h3>
      <div class="wf-component--select-card choice-block ceo-action-section" :class="choiceBlockClass(section.cards.length)" :style="choiceBlockStyle(section.cards.length)">
        <label v-for="card in section.cards" :key="card.name" :class="['cardbox', visibilityClass(card)]">
          <input type="radio" :name="binding.radioElementName + '-actions'" :value="card.name" :data-action-card="card.name"
            :checked="binding.selectedIdx === section.index && binding.selectedChoice?.type === 'card' && binding.selectedChoice.name === card.name"
            :disabled="card.isDisabled === true" @change="binding.selectChoice(binding.displayedOptions[section.index], {type: 'card', name: card.name})">
          <Card :card="card"/>
        </label>
      </div>
    </section>
    <CardListSection v-if="inactive.used.length > 0" data-inactive-section="Actions already used" title="Actions already used" :cards="inactive.used"
      :unavailable="true" :actionUsed="true" :cubeColor="binding.playerView.thisPlayer.color" :visibility="visibility"/>
    <CardListSection v-if="inactive.unavailable.length > 0" data-inactive-section="Actions not usable" title="Actions not usable" :cards="inactive.unavailable"
      :unavailable="true" :visibility="visibility"/>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {OrOptionsBinding} from './presentation';
import type {CardModel} from '@/common/models/CardModel';
import type {SelectCardModel} from '@/common/models/PlayerInputModel';
import {ACTION_CARDS_TITLE, CEO_ACTION_TITLE, actionOption, inactiveActionCards, orderActionCards} from './actionCards';
import {choiceBlockClass, choiceBlockStyle} from './choiceBlock';
import Card from '@/client/wrybit/visuals/card/Card.vue';
import CardListSection from '@/client/wrybit/visuals/CardListSection.vue';
import CardFilterBar from '@/client/wrybit/visuals/cardfilter/CardFilterBar.vue';
import CardSortMenu from '@/client/wrybit/visuals/cardfilter/CardSortMenu.vue';
import {cardVisibility, playedCardFilter, playedCardsSortOrder} from '@/client/wrybit/visuals/cardfilter/cardFilterState';

const props = defineProps<{binding: OrOptionsBinding}>();
const filterContext = {withCost: false};
const sections = computed(() => [ACTION_CARDS_TITLE, CEO_ACTION_TITLE].flatMap((title) => {
  const index = actionOption(props.binding.displayedOptions, title);
  const input = props.binding.displayedOptions[index];
  return input?.type === 'card' ? [{index, title: title === CEO_ACTION_TITLE ? 'CEO' : 'Action cards', cards: orderActionCards(input.cards), input}] : [];
}));
const cards = computed(() => sections.value.flatMap((section) => [...section.cards]));
const inactive = computed(() => inactiveActionCards(props.binding.playerView.thisPlayer, sections.value.map((section): SelectCardModel => section.input)));
function visibility(card: CardModel) {
  return cardVisibility(card, playedCardFilter, filterContext);
}
function visibilityClass(card: CardModel) {
  const value = visibility(card);
  return value === 'shown' ? undefined : 'card-filter-' + value;
}
</script>
