<template>
  <div data-hotkey-group class="payments_cont choice-block" :class="[choiceBlockClass(allCards.length, isHandSelection), {'choice-block--sections': unplayableCards.length > 0}]" :style="choiceBlockStyle(allCards.length)" @tm-carousel-unselect="binding.clearSelection()">
    <CardFilterBar v-if="isHandSelection" :cards="allCards" :filter="handCardFilter" :context="filterContext">
      <template #sort="{compact}"><HandSortControl :playerView="binding.playerView" :compact="compact" :allowManual="true" /></template>
    </CardFilterBar>
    <CardZoomBar v-else />
    <TabPanelIntroSlot v-if="showIntro"><InputIntro :input="binding.playerinput" :playerView="binding.playerView" belowHeader /></TabPanelIntroSlot>
    <CardFilterEmptyHint v-if="nothingShown" @reset="resetCardFilter(handCardFilter)" />
    <label v-for="card in offeredCards" class="payments_cards" :class="visibilityClass(card)" :key="card.name">
      <input v-if="!card.isDisabled" class="hidden" type="radio" :checked="binding.cardName === card.name" :value="card.name" @change="binding.select(card.name)">
      <Card class="cardbox" :card="card" />
      <div v-if="card.additionalProjectCosts?.conglomeratesCost !== undefined" class="card-warning"
        v-i18n="[card.additionalProjectCosts.conglomeratesCost]" data-test="conglomerates-cost">
        This currently costs ${0} Coordination
      </div>
    </label>
    <template v-if="binding.card?.additionalProjectCosts">
      <div v-if="binding.card.additionalProjectCosts.aeronGenomicsResources" class="card-warning"
        v-i18n="[$t(binding.card.name), binding.card.additionalProjectCosts.aeronGenomicsResources, 'animals', $t(CardName.AERON_GENOMICS)]">
        Playing ${0} consumes ${1} ${2} from ${3}
      </div>
      <div v-if="binding.card.additionalProjectCosts.thinkTankResources" class="card-warning"
        v-i18n="[$t(binding.card.name), binding.card.additionalProjectCosts.thinkTankResources, 'data', $t(CardName.THINK_TANK)]">
        Playing ${0} consumes ${1} ${2} from ${3}
      </div>
      <div v-if="binding.card.additionalProjectCosts.redsCost" class="card-warning" v-i18n="[$t(binding.card.name), binding.card.additionalProjectCosts.redsCost, $t('Reds')]">
        Playing ${0} will cost ${1} M€ more because ${2} are in power
      </div>
    </template>
    <WarningsComponent v-if="binding.card !== undefined" :warnings="binding.card.warnings" />
    <template v-if="unplayableCards.length > 0">
      <h3 class="hand-cards-panel__title choice-section-title choice-section-title--separated">{{ $t('Not playable') }} <small>{{ unplayableCards.length }}</small></h3>
      <label v-for="card in unplayableCards" :key="card.name" class="payments_cards payments_cards--unplayable" :class="visibilityClass(card)">
        <Card class="cardbox" :card="{...card, isDisabled: true}" />
      </label>
    </template>
    <PresentationHost :hosts="binding.paymentHost" />
  </div>
</template>

<script setup lang="ts">
import InputIntro from './InputIntro.vue';
import TabPanelIntroSlot from './TabPanelIntroSlot.vue';
import {useCardInputIntro} from './cardInputIntro';
import {computed, watch} from 'vue';
import {registerProjectCard} from '@/client/wrybit/shell/inputBridge';
import type {ProjectCardBinding} from './presentation';
import PresentationHost from './PresentationHost.vue';
import Card from '@/client/wrybit/visuals/card/Card.vue';
import WarningsComponent from '@/client/components/WarningsComponent.vue';
import CardFilterBar from '@/client/wrybit/visuals/cardfilter/CardFilterBar.vue';
import CardFilterEmptyHint from '@/client/wrybit/visuals/cardfilter/CardFilterEmptyHint.vue';
import CardZoomBar from '@/client/wrybit/visuals/cardfilter/CardZoomBar.vue';
import HandSortControl from '@/client/wrybit/visuals/HandSortControl.vue';
import {CardFilterContext, resetCardFilter} from '@/client/wrybit/visuals/cardfilter/cardFilter';
import {activateCardFilterOwner, cardVisibility, handCardFilter} from '@/client/wrybit/visuals/cardfilter/cardFilterState';
import {allCardsInHand} from '@/client/wrybit/visuals/cardfilter/handCards';
import {handSortState} from '@/client/wrybit/visuals/cardfilter/handSort';
import {CardOrderStorage} from '@/client/utils/CardOrderStorage';
import {CardName} from '@/common/cards/CardName';
import type {CardModel} from '@/common/models/CardModel';
import {choiceBlockClass, choiceBlockStyle} from './choiceBlock';

const props = defineProps<{binding: ProjectCardBinding}>();
registerProjectCard(computed(() => props.binding));
const parentIntro = useCardInputIntro();
const showIntro = computed(() => props.binding.showtitle || parentIntro.value);
watch(() => props.binding.playerView.id, activateCardFilterOwner, {immediate: true});
const hand = computed(() => allCardsInHand(props.binding.playerView));
const offeredNames = computed(() => new Set(props.binding.cards.map((card) => card.name)));
const isHandSelection = computed(() => props.binding.cards.some((card) => hand.value.some((own) => own.name === card.name)));
const offeredCards = computed(() => {
  handSortState(props.binding.playerView.id).revision;
  return CardOrderStorage.getOrdered(CardOrderStorage.getCardOrder(props.binding.playerView.id), props.binding.cards);
});
const unplayableCards = computed(() => isHandSelection.value ? hand.value.filter((card) => !offeredNames.value.has(card.name)) : []);
const allCards = computed(() => [...offeredCards.value, ...unplayableCards.value]);
const filterContext = computed((): CardFilterContext => ({withCost: true, playable: new Set(props.binding.cards.filter((card) => !card.isDisabled).map((card) => card.name))}));
function visibilityClass(card: CardModel): string | undefined {
  const visibility = cardVisibility(card, handCardFilter, filterContext.value);
  return visibility === 'shown' ? undefined : 'card-filter-' + visibility;
}
const nothingShown = computed(() => allCards.value.length > 0 && allCards.value.every((card) => cardVisibility(card, handCardFilter, filterContext.value) === 'hidden'));
</script>
