<template>
  <div data-hotkey-group class="wf-component wf-component--select-card choice-block" :class="[choiceBlockClass(allCards.length, isHandSelection || binding.playerinput.showOwner || sections.trailing.length > 0), {'choice-block--sections': sections.trailing.length > 0}]" :style="choiceBlockStyle(allCards.length)" data-source-card-choice>
    <CardFilterBar v-if="isHandSelection || binding.playerinput.selectBlueCardAction" :cards="allCards" :filter="filter" :context="filterContext">
      <template #lead><AppButton v-if="binding.showSelectAll" size="small" @click="binding.toggleAll()" :title="$t(binding.allSelected ? 'Deselect All' : 'Select All')" /></template>
      <template #sort="{compact}">
        <HandSortControl v-if="isHandSelection" :playerView="binding.playerView" :compact="compact" :allowManual="true" />
        <CardSortMenu v-else v-model="playedCardsSortOrder" :compact="compact" />
      </template>
    </CardFilterBar>
    <CardZoomBar v-else><template v-if="binding.showSelectAll" #lead><AppButton size="small" @click="binding.toggleAll()" :title="$t(binding.allSelected ? 'Deselect All' : 'Select All')" /></template></CardZoomBar>
    <TabPanelIntroSlot v-if="showIntro"><InputIntro :input="binding.playerinput" :playerView="binding.playerView" :draftRepick="repick" belowHeader /></TabPanelIntroSlot>
    <CardFilterEmptyHint v-if="nothingShown" @reset="resetCardFilter(filter)" />
    <h3 v-if="sections.title !== undefined" class="hand-cards-panel__title choice-section-title">{{ $t(sections.title) }} <small>{{ cards.length }}</small></h3>
    <template v-for="group in groups" :key="group.owner?.color ?? 'none'">
      <h3 v-if="group.owner !== undefined" class="hand-cards-panel__title select-card-owner-title">
        <PlayerCube :color="group.owner.color" view="slight" :size="11" />{{ group.owner.name }} <small>{{ group.cards.length }}</small>
      </h3>
      <label v-for="card in group.cards" :key="card.name" :data-card-name="card.name" :class="['cardbox', visibilityClass(card), pickClass(card), {'cardbox--unaffordable': cannotAfford}]" @click="keepCurrentPick(card)">
        <template v-if="!card.isDisabled">
          <input v-if="binding.single" type="radio" v-model="selected" :value="card">
          <input v-else type="checkbox" v-model="selected" :value="card" :disabled="Array.isArray(binding.selected) && binding.selected.length >= binding.playerinput.max && !proposed(card)">
        </template>
        <Card :card="card" :robotCard="binding.robotCard(card)">
          <span v-if="currentPicks.has(card.name) && !proposed(card)" class="current-pick-tab" :role="card.isDisabled ? 'button' : undefined" :tabindex="card.isDisabled ? 0 : undefined"
            :aria-label="card.isDisabled ? $t('Keep current pick') : undefined" @keydown.enter.prevent="keepCurrentPick(card)" @keydown.space.prevent="keepCurrentPick(card)">
            {{ (binding.count === 0 ? '✓ ' : '') + $t(binding.count === 0 ? 'Your pick – can be changed' : 'Previous pick') }}
          </span>
        </Card>
      </label>
    </template>
    <CardListSection v-for="section in sections.trailing" :key="section.title" :data-trailing-section="section.title" v-bind="section" :visibility="visibilityOf" />
    <div v-if="binding.warning !== undefined" class="card-warning">{{ $t(binding.warning) }}</div>
    <WarningsComponent :warnings="binding.warnings" />
    <TabPanelFooterSlot>
      <span v-if="repick" class="or-tab-footer-hint">{{ $t(fullTabTitle(binding.playerinput.title)) }}</span>
      <div v-if="binding.showsave" class="nofloat select-card-actions">
        <span v-if="hiddenSelectedCount > 0" class="card-filter-hidden-note">{{ $t('Selected cards hidden by filters') }}: {{ hiddenSelectedCount }}</span>
        <template v-if="cannotAfford">
          <span class="select-card-unaffordable" v-i18n="[String(binding.playerView.thisPlayer.cardCost), String(binding.playerView.thisPlayer.megacredits)]">Not enough money: a card costs ${0} M€, you only have ${1} M€</span>
          <AppButton :disabled="true" type="submit" :title="$t('Buy')" class="btn-tone-success" />
          <AppButton type="submit" hotkey="cancel" @click="binding.save()" :title="$t('Discard')" class="btn-tone-danger" />
        </template>
        <template v-else>
          <AppButton :disabled="!binding.canSave || (binding.optionalMany && binding.count === 0)" type="submit" hotkey="confirm" @click="binding.save()" :title="binding.count === 0 ? binding.playerinput.buttonLabel : binding.buttonLabel" :class="{'btn-tone-success': binding.optionalMany}" />
          <AppButton v-if="binding.optionalMany" :disabled="binding.count > 0" type="submit" hotkey="cancel" @click="binding.save()" :title="$t('Skip this action')" class="btn-tone-danger" />
        </template>
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import InputIntro from './InputIntro.vue';
import TabPanelIntroSlot from './TabPanelIntroSlot.vue';
import {useCardInputIntro} from './cardInputIntro';
import {computed, shallowRef, watch} from 'vue';
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
import CardListSection from '@/client/wrybit/visuals/CardListSection.vue';
import {currentDraftPicks, isDraftInput, keepDraftCardOrder} from './draftCards';
import {selectCardSections} from './cardSections';
import {fullTabTitle, titleKey} from './orOptionsShortLabels';

const props = defineProps<{binding: CardSelectionBinding}>();
watch(() => props.binding.playerView.id, activateCardFilterOwner, {immediate: true});
const selected = computed({get: () => props.binding.selected, set: (cards) => props.binding.select(cards)});
const isDraft = computed(() => isDraftInput(props.binding.playerView, props.binding.playerinput));
const repick = computed(() => isDraft.value && props.binding.playerinput.optional === true);
const parentIntro = useCardInputIntro();
const showIntro = computed(() => props.binding.showtitle || parentIntro.value);
const draftOrder = shallowRef<ReadonlyArray<CardModel>>([]);
watch([() => props.binding.playerView.id, () => props.binding.playerinput.cards,
  () => props.binding.playerinput.cards.map((card) => card.name).join('\0'), () => isDraft.value], () => {
  draftOrder.value = isDraft.value ? keepDraftCardOrder(props.binding.playerView.id, props.binding.playerinput.cards) : [];
}, {immediate: true});
const currentPicks = computed(() => currentDraftPicks(props.binding.playerView, props.binding.playerinput));
const sections = computed(() => selectCardSections(props.binding.playerView, props.binding.playerinput));
const cannotAfford = computed(() => props.binding.playerinput.max === 0 && titleKey(props.binding.playerinput.title) === 'You cannot afford any cards');
const isHandSelection = computed(() => props.binding.playerinput.cards.some((card) => allCardsInHand(props.binding.playerView).some((own) => own.name === card.name)));
const filter = computed(() => isHandSelection.value ? handCardFilter : props.binding.playerinput.selectBlueCardAction ? playedCardFilter : emptyCardFilter());
const filterContext = computed((): CardFilterContext => ({withCost: isHandSelection.value}));
const cards = computed(() => {
  if (isDraft.value) {
    return draftOrder.value;
  }
  handSortState(props.binding.playerView.id).revision;
  const ordered = isHandSelection.value ? CardOrderStorage.getOrdered(CardOrderStorage.getCardOrder(props.binding.playerView.id), props.binding.orderedCards) : props.binding.orderedCards;
  return props.binding.playerinput.selectBlueCardAction && playedCardsSortOrder.value !== undefined ? sortCards(ordered, playedCardsSortOrder.value) : ordered;
});
const allCards = computed(() => [...cards.value, ...sections.value.trailing.flatMap((section) => [...section.cards])]);
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
  const visibility = visibilityOf(card);
  return visibility === 'shown' ? undefined : 'card-filter-' + visibility;
}
function visibilityOf(card: CardModel) {
  return cardVisibility(card, filter.value, filterContext.value);
}
function proposed(card: CardModel) {
  return (Array.isArray(props.binding.selected) ? props.binding.selected : [props.binding.selected]).some((selected) => selected.name === card.name);
}
function pickClass(card: CardModel) {
  return !currentPicks.value.has(card.name) || proposed(card) ? undefined : props.binding.count === 0 ? 'cardbox--current-pick' : 'cardbox--current-pick-replaced';
}
function keepCurrentPick(card: CardModel) {
  if (card.isDisabled && currentPicks.value.has(card.name)) {
    props.binding.select([]);
  }
}
const nothingShown = computed(() => allCards.value.length > 0 && allCards.value.every((card) => visibilityOf(card) === 'hidden'));
const hiddenSelectedCount = computed(() => (Array.isArray(props.binding.selected) ? props.binding.selected : [props.binding.selected]).filter((card) => cardVisibility(card, filter.value, filterContext.value) === 'hidden').length);
</script>
