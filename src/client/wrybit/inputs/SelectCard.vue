<template>
  <div class="wf-component wf-component--select-card choice-block" :class="choiceBlockClass(cards.length, isHandSelection || binding.playerinput.showOwner)" :style="choiceBlockStyle(cards.length)" data-source-card-choice>
    <div v-if="binding.showtitle" class="nofloat wf-component-title">{{ $t(binding.playerinput.title) }}</div>
    <CardFilterBar v-if="isHandSelection || binding.playerinput.selectBlueCardAction" :cards="binding.playerinput.cards" :filter="filter" :context="filterContext">
      <template #lead><AppButton v-if="binding.showSelectAll" size="small" @click="binding.toggleAll()" :title="$t(binding.allSelected ? 'Deselect All' : 'Select All')"/></template>
      <template #sort="{compact}">
        <HandSortControl v-if="isHandSelection" :playerView="binding.playerView" :compact="compact" :allowManual="true"/>
        <CardSortMenu v-else v-model="playedCardsSortOrder" :compact="compact"/>
      </template>
    </CardFilterBar>
    <CardZoomBar v-else><template v-if="binding.showSelectAll" #lead><AppButton size="small" @click="binding.toggleAll()" :title="$t(binding.allSelected ? 'Deselect All' : 'Select All')"/></template></CardZoomBar>
    <CardFilterEmptyHint v-if="nothingShown" @reset="resetCardFilter(filter)"/>
    <template v-for="group in groups" :key="group.owner?.color ?? 'none'">
      <h3 v-if="group.owner !== undefined" class="hand-cards-panel__title select-card-owner-title">
        <PlayerCube :color="group.owner.color" view="slight" :size="11"/>{{ group.owner.name }} <small>{{ group.cards.length }}</small>
      </h3>
      <label v-for="card in group.cards" :key="card.name" :class="['cardbox', visibilityClass(card)]">
        <template v-if="!card.isDisabled">
          <input v-if="binding.single" type="radio" v-model="selected" :value="card">
          <input v-else type="checkbox" v-model="selected" :value="card" :disabled="Array.isArray(binding.selected) && binding.selected.length >= binding.playerinput.max && !binding.selected.includes(card)">
        </template>
        <Card :card="card" :robotCard="binding.robotCard(card)"/>
      </label>
    </template>
    <div v-if="binding.warning !== undefined" class="card-warning">{{ $t(binding.warning) }}</div>
    <WarningsComponent :warnings="binding.warnings"/>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="nofloat select-card-actions">
        <span v-if="hiddenSelectedCount > 0" class="card-filter-hidden-note">{{ $t('Selected cards hidden by filters') }}: {{ hiddenSelectedCount }}</span>
        <AppButton :disabled="binding.optionalMany && binding.count === 0" type="submit" @click="binding.save()" :title="binding.buttonLabel" :class="{'btn-tone-success': binding.optionalMany}"/>
        <AppButton v-if="binding.optionalMany" :disabled="binding.count > 0" type="submit" @click="binding.save()" :title="$t('Skip this action')" class="btn-tone-danger"/>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import {computed, watch} from 'vue';
import type {CardSelectionBinding} from './presentation';
import type {CardModel} from '@/common/models/CardModel';
import {choiceBlockClass, choiceBlockStyle} from './choiceBlock';
import Card from '@/client/wrybit/visuals/card/Card.vue';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import WarningsComponent from '@/client/components/WarningsComponent.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import CardFilterBar from '@/client/wrybit/visuals/cardfilter/CardFilterBar.vue';
import CardFilterEmptyHint from '@/client/wrybit/visuals/cardfilter/CardFilterEmptyHint.vue';
import CardZoomBar from '@/client/wrybit/visuals/cardfilter/CardZoomBar.vue';
import CardSortMenu from '@/client/wrybit/visuals/cardfilter/CardSortMenu.vue';
import HandSortControl from '@/client/wrybit/visuals/HandSortControl.vue';
import {CardFilterContext, emptyCardFilter, resetCardFilter} from '@/client/wrybit/visuals/cardfilter/cardFilter';
import {activateCardFilterOwner, cardVisibility, handCardFilter, playedCardFilter, playedCardsSortOrder} from '@/client/wrybit/visuals/cardfilter/cardFilterState';
import {allCardsInHand} from '@/client/wrybit/visuals/cardfilter/handCards';
import {handSortState} from '@/client/wrybit/visuals/cardfilter/handSort';
import {CardOrderStorage} from '@/client/utils/CardOrderStorage';
import {sortCards} from '@/client/utils/SortOrder';

const props = defineProps<{binding: CardSelectionBinding}>();
watch(() => props.binding.playerView.id, activateCardFilterOwner, {immediate: true});
const selected = computed({get: () => props.binding.selected, set: (cards) => props.binding.select(cards)});
const isHandSelection = computed(() => props.binding.playerinput.cards.some((card) => allCardsInHand(props.binding.playerView).some((own) => own.name === card.name)));
const filter = computed(() => isHandSelection.value ? handCardFilter : props.binding.playerinput.selectBlueCardAction ? playedCardFilter : emptyCardFilter());
const filterContext = computed((): CardFilterContext => ({withCost: isHandSelection.value}));
const cards = computed(() => {
  handSortState(props.binding.playerView.id).revision;
  const ordered = isHandSelection.value ? CardOrderStorage.getOrdered(CardOrderStorage.getCardOrder(props.binding.playerView.id), props.binding.orderedCards) : props.binding.orderedCards;
  return props.binding.playerinput.selectBlueCardAction && playedCardsSortOrder.value !== undefined ? sortCards(ordered, playedCardsSortOrder.value) : ordered;
});
const groups = computed(() => {
  if (!props.binding.playerinput.showOwner) {
    return [{cards: cards.value, owner: undefined}];
  }
  const owners = props.binding.playerView.players.filter((player) => player.color !== props.binding.playerView.thisPlayer.color).concat(props.binding.playerView.thisPlayer);
  const known = owners.map((owner) => ({owner, cards: cards.value.filter((card) => props.binding.owner(card).color === owner.color)})).filter((group) => group.cards.length > 0);
  const unknown = cards.value.filter((card) => !owners.some((owner) => owner.color === props.binding.owner(card).color));
  return unknown.length > 0 ? [...known, {owner: undefined, cards: unknown}] : known;
});
function visibilityClass(card: CardModel): string | undefined {
  const visibility = cardVisibility(card, filter.value, filterContext.value);
  return visibility === 'shown' ? undefined : 'card-filter-' + visibility;
}
const nothingShown = computed(() => cards.value.length > 0 && cards.value.every((card) => cardVisibility(card, filter.value, filterContext.value) === 'hidden'));
const hiddenSelectedCount = computed(() => (Array.isArray(props.binding.selected) ? props.binding.selected : [props.binding.selected]).filter((card) => cardVisibility(card, filter.value, filterContext.value) === 'hidden').length);
</script>
