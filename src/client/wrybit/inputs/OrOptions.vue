<template>
  <TradeFees v-if="tradeFee" :binding="binding"/>
  <div v-else :class="['wf-options', {'wf-options--tabs': binding.asTabs}]" data-source-or>
    <label v-if="binding.showtitle && !binding.asTabs && !tileMenu"><div>{{ $t(binding.playerinput.title) }}</div></label>
    <label v-if="binding.playerinput.warning !== undefined" class="card-warning"><div>({{ $t(binding.playerinput.warning) }})</div></label>
    <div v-if="binding.asTabs && !tileMenu && outerFooter === undefined && spaceChoice === undefined" class="or-tabs" role="tablist">
      <HandCardsTab :count="handCount" :active="handTabActive" @select="handTabActive = true"/>
      <button v-for="idx in tabOrder" :key="idx" type="button" role="tab"
        :ref="(el) => registerLabel(idx, el)"
        :data-option-index="idx" :title="$t(fullTabTitle(tabTitle(idx)))"
        :aria-selected="tabActive(idx)"
        :class="['or-tab', toneClass('or-tab--tone-', binding.displayedOptions[idx]), {'or-tab--active': tabActive(idx), 'or-tab--empty': tabCount(idx) === 0, 'or-tab--highlight': tabHighlighted(tabTitle(idx)), 'or-tab--end': isEndTab(tabTitle(idx))}]"
        @click="selectTab(binding.displayedOptions[idx])">
        <OrOptionsTabIcon v-for="icon in iconsFor(idx)" :key="icon" :icon="icon"/>
        <span class="or-tab-title">{{ $t(shortTabLabel(tabTitle(idx))) }}</span>
        <span v-if="tabCount(idx) !== undefined" class="or-tab-count">{{ tabCount(idx) }}</span>
      </button>
    </div>
    <div :class="[{'or-tab-panel': binding.asTabs && outerFooter === undefined, 'or-tab-panel--view': binding.asTabs && handTabActive, 'or-tab-panel--end': !handTabActive && binding.selectedOption !== undefined && isEndTab(binding.selectedOption.title)}, !handTabActive && binding.selectedOption ? toneClass('or-tab-panel--tone-', binding.selectedOption) : undefined]" :role="binding.asTabs && outerFooter === undefined ? 'tabpanel' : undefined">
      <HandCardsPanel v-if="binding.asTabs && !tileMenu && handTabActive" :playerView="binding.playerView"/>
      <template v-if="!binding.asTabs && !tileMenu">
        <div v-for="(option, idx) in binding.displayedOptions" :key="idx">
          <label class="form-radio" :ref="(el) => registerLabel(idx, el)">
            <input type="radio" :name="binding.radioElementName" :value="idx" :checked="binding.selectedIdx === idx" @change="binding.select(option)">
            <i class="form-icon"></i><span>{{ $t(option.title) }}</span>
          </label>
          <PresentationHost v-if="binding.selectedIdx === idx" :hosts="binding.childHost" style="margin-left: 30px"/>
        </div>
      </template>
      <CardIntroBlock v-if="tileMenu && sourceCard !== undefined && !sameAmountIntro" :card="sourceCard" :title="binding.playerinput.title"/>
      <div v-else-if="tileMenu && !sameAmountIntro" class="or-tab-intro or-tab-question"><div class="or-tab-intro-title">{{ $t(binding.playerinput.title) }}</div></div>
      <InputIntro v-else-if="spaceChoice !== undefined" :input="spaceChoice.space" :title="binding.playerinput.title" :playerView="binding.playerView"/>
      <InputIntro v-else-if="binding.asTabs && binding.selectedOption !== undefined && !handTabActive && !inActionsGroup && !childOwnsIntro"
        :input="binding.selectedOption" :playerView="binding.playerView"/>
      <AppButton v-if="spaceChoice !== undefined && binding.selectedOption !== spaceChoice.space" class="space-choose-option"
        :title="$t(fullTabTitle(spaceChoice.space.title))" @click="binding.select(spaceChoice.space)"/>
      <MilestoneAwardOptions v-if="maChoices !== undefined" :choices="maChoices" :selected="binding.selectedIdx" :groupName="binding.radioElementName" @select="selectIndex"/>
      <PartyOptions v-else-if="parties !== undefined && binding.playerView.game.turmoil !== undefined" :choices="parties" :selected="binding.selectedIdx"
        :groupName="binding.radioElementName" :turmoil="binding.playerView.game.turmoil" @select="selectIndex"/>
      <div v-else-if="tileMenu" class="choice-options choice-block" :class="{'choice-options--players': hasPlayerChoice}" :style="choiceBlockStyle(tileCount)" role="radiogroup">
        <template v-for="(option, index) in binding.displayedOptions" :key="index">
          <template v-if="option.type === 'player'">
            <PlayerOptionTile v-for="color in option.players" :key="color" :color="color" :player="binding.playerView.players.find((player) => player.color === color)"
              :caption="option.title" :selected="binding.selectedIdx === index && binding.selectedChoice?.type === 'player' && binding.selectedChoice.color === color"
              :groupName="binding.radioElementName" @select="selectPlayer(option, $event)"/>
          </template>
          <ChoiceOptionTile v-else :title="option.title" :selected="binding.selectedIdx === index" :groupName="binding.radioElementName" @select="binding.select(option)"/>
        </template>
      </div>
      <ActionCardSections v-if="inActionsGroup" v-show="!handTabActive" :binding="binding"/>
      <PresentationHost v-if="binding.asTabs || tileMenu" v-show="!handTabActive && !inActionsGroup && (!tileMenu || inlineChoice)" :hosts="binding.childHost"/>
      <p v-if="binding.asTabs && !handTabActive && binding.selectedOption && endTabHint(binding.selectedOption.title) !== undefined" class="or-tab-end-hint">{{ $t(endTabHint(binding.selectedOption.title) ?? '') }}</p>
      <PresentationHost v-if="binding.asTabs" :hosts="binding.footerHost" :target="outerFooter"
        :class="{'or-tab-footer': outerFooter === undefined}" :style="{display: handTabActive ? 'none' : undefined}">
        <ActionStepChips v-if="turnStep !== undefined" :step="turnStep"/>
        <CancelActionButton v-if="outerFooter === undefined"/>
        <template v-if="spaceChoice !== undefined && binding.showsave">
          <AppButton v-for="(option, index) in spaceChoice.skips" :key="index" class="space-skip-option btn-tone-danger"
            :title="$t(fullTabTitle(option.title))" @click="skip(option)"/>
        </template>
        <div v-if="showSave" :class="['wf-action', 'or-tab-save', binding.selectedOption ? toneClass('or-tab-save--', binding.selectedOption) : undefined]"><AppButton :title="$t(saveLabel)" type="submit" :disabled="saveDisabled" @click="binding.save()"/></div>
      </PresentationHost>
      <TabPanelFooterSlot v-else-if="showSave">
        <div class="wf-action or-options-save"><AppButton :title="$t(binding.selectedOption?.buttonLabel ?? '')" type="submit" :disabled="saveDisabled" @click="binding.save()"/></div>
      </TabPanelFooterSlot>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, inject, ref} from 'vue';
import {registerCompositeView} from './compositePresentation';
import {registerRootOr} from '@/client/wrybit/shell/inputBridge';
import TradeFees from '@/client/wrybit/expansions/colonies/TradeFees.vue';
import {isTradeChild} from '@/client/wrybit/expansions/colonies/tradeInput';
import {ROOT_INPUT_FOOTER, useInputPresentation} from './presentation';
import type {ColorWithNeutral} from '@/common/Color';
import type {ComponentPublicInstance} from 'vue';
import type {OrOptionsBinding} from './presentation';
import type {PlayerInputModel} from '@/common/models/PlayerInputModel';
import PresentationHost from './PresentationHost.vue';
import HandCardsTab from '@/client/wrybit/visuals/HandCardsTab.vue';
import HandCardsPanel from '@/client/wrybit/visuals/HandCardsPanel.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import {allCardsInHand} from '@/client/wrybit/visuals/cardfilter/handCards';
import OrOptionsTabIcon from './OrOptionsTabIcon.vue';
import ActionStepChips from './ActionStepChips.vue';
import {actionStep} from './actionStep';
import {endTabHint, fullTabTitle, isEndTab, optionTone, shortTabLabel, tabButtonLabel, tabDisplayOrder, tabHighlighted, tabIcon} from './orOptionsShortLabels';
import type {TabIcon} from './orOptionsShortLabels';
import {choiceBlockStyle} from './choiceBlock';
import {INLINE_INPUT_TYPES, isChoiceMenu} from './choiceMenu';
import {ACTION_CARDS_TITLE, CEO_ACTION_TITLE, actionOption, ownCeoCards} from './actionCards';
import ChoiceOptionTile from './ChoiceOptionTile.vue';
import PlayerOptionTile from './PlayerOptionTile.vue';
import ActionCardSections from './ActionCardSections.vue';
import {milestoneAwardChoices} from './milestoneAwardChoice';
import {partyChoices} from './partyChoice';
import MilestoneAwardOptions from './MilestoneAwardOptions.vue';
import PartyOptions from './PartyOptions.vue';
import CardIntroBlock from './CardIntroBlock.vue';
import {inputSourceCard} from './inputSourceCard';
import {spaceWithSkip} from './spaceWithSkip';
import {boardZoomSurface} from '@/client/wrybit/visuals/board/boardZoomSurface';
import CancelActionButton from './CancelActionButton.vue';
import InputIntro from './InputIntro.vue';

const props = defineProps<{binding: OrOptionsBinding}>();
registerRootOr(computed(() => props.binding));
const composite = registerCompositeView('or', computed(() => props.binding));
const tradeFee = computed(() => isTradeChild(composite?.input.value, props.binding.playerinput, 'fee'));
const sourceCard = computed(() => inputSourceCard(props.binding.playerinput));
const cardView = useInputPresentation('card');
const projectView = useInputPresentation('projectCard');
const amountView = useInputPresentation('amount');
const childOwnsIntro = computed(() => {
  const input = props.binding.selectedOption;
  return input !== undefined && ((input.type === 'amount' && input.preview !== undefined && amountView.value !== undefined) ||
    (props.binding.asTabs && ((input.type === 'card' && cardView.value !== undefined) || (input.type === 'projectCard' && projectView.value !== undefined))));
});
const sameAmountIntro = computed(() => props.binding.selectedOption?.type === 'amount' && amountView.value !== undefined &&
  props.binding.selectedOption.preview?.sourceCard === sourceCard.value && sourceCard.value !== undefined);
const rootFooter = inject(ROOT_INPUT_FOOTER, undefined);
const outerFooter = computed(() => props.binding.asTabs ? rootFooter?.value : undefined);
const handTabActive = ref(false);
const spaceChoice = computed(() => props.binding.asTabs ? spaceWithSkip({...props.binding.playerinput, options: [...props.binding.displayedOptions]}) : undefined);
const maChoices = computed(() => milestoneAwardChoices({...props.binding.playerinput, options: [...props.binding.displayedOptions]}, props.binding.playerView.game));
const parties = computed(() => maChoices.value === undefined ? partyChoices(props.binding.displayedOptions, props.binding.partyCards) : undefined);
const tileMenu = computed(() => maChoices.value !== undefined || parties.value !== undefined || isChoiceMenu(props.binding.playerinput));
const tileCount = computed(() => props.binding.displayedOptions.reduce((count, option) => count + (option.type === 'player' ? option.players.length : 1), 0));
const hasPlayerChoice = computed(() => props.binding.displayedOptions.some((option) => option.type === 'player'));
const inlineChoice = computed(() => props.binding.selectedOption !== undefined && (INLINE_INPUT_TYPES as ReadonlyArray<string>).includes(props.binding.selectedOption.type));
const actionsIndex = computed(() => actionOption(props.binding.displayedOptions, ACTION_CARDS_TITLE));
const ceoIndex = computed(() => actionOption(props.binding.displayedOptions, CEO_ACTION_TITLE));
const groupIndex = computed(() => actionsIndex.value !== -1 ? actionsIndex.value : ceoIndex.value);
const actionsGrouped = computed(() => props.binding.asTabs && groupIndex.value !== -1 && ownCeoCards(props.binding.playerView.thisPlayer).length > 0);
const inActionsGroup = computed(() => actionsGrouped.value && props.binding.selectedIdx !== -1 && [actionsIndex.value, ceoIndex.value].includes(props.binding.selectedIdx));
const handCount = computed(() => allCardsInHand(props.binding.playerView).length);
const showSave = computed(() => spaceChoice.value === undefined && props.binding.showsave && props.binding.selectedOption !== undefined && !props.binding.showChildSaveButton(props.binding.selectedOption));
// Source visual ordering only; the canonical controller retains original response indices.
const tabOrder = computed(() => tabDisplayOrder(props.binding.displayedOptions.map((option) => option.title)).filter((index) => !actionsGrouped.value || actionsIndex.value === -1 || index !== ceoIndex.value));
const turnStep = computed(() => actionStep(props.binding.playerinput));
const saveLabel = computed(() => props.binding.selectedOption ? tabButtonLabel(props.binding.selectedOption.title, props.binding.selectedOption.buttonLabel) : '');
const saveDisabled = computed(() => (props.binding.selectedOption?.type === 'player' && props.binding.selectedChoice?.type !== 'player') ||
  (props.binding.selectedOption?.type === 'card' && props.binding.selectedOption.min === 1 && props.binding.selectedOption.max === 1 && props.binding.selectedChoice?.type !== 'card'));
function tabTitle(index: number) {
  return actionsGrouped.value && index === groupIndex.value ? ACTION_CARDS_TITLE : props.binding.displayedOptions[index].title;
}
function tabActive(index: number) {
  return !handTabActive.value && (props.binding.selectedIdx === index || (actionsGrouped.value && index === groupIndex.value && inActionsGroup.value));
}
function tabCount(index: number) {
  return actionsGrouped.value && index === groupIndex.value ? [actionsIndex.value, ceoIndex.value].filter((value) => value !== -1)
    .reduce((total, value) => total + (availableCount(props.binding.displayedOptions[value]) ?? 0), 0) : availableCount(props.binding.displayedOptions[index]);
}
function selectPlayer(option: PlayerInputModel, color: ColorWithNeutral) {
  if (color !== 'NEUTRAL') {
    void props.binding.selectChoice(option, {type: 'player', color});
  }
}
async function skip(option: PlayerInputModel) {
  const commit = props.binding.chooseAndSave;
  props.binding.select(option);
  await boardZoomSurface(props.binding.playerView.game.gameId)?.close();
  await commit(option);
}
function selectIndex(index: number) {
  const option = props.binding.displayedOptions[index];
  if (option !== undefined) {
    props.binding.select(option);
  }
}
function iconsFor(index: number): Array<TabIcon> {
  const icon = tabIcon(tabTitle(index));
  return icon === undefined ? [] : [icon];
}
function toneClass(prefix: string, option: PlayerInputModel): string | undefined {
  const tone = optionTone(option);
  return tone === undefined ? undefined : prefix + tone;
}
function availableCount(input: PlayerInputModel): number | undefined {
  if (input.type === 'projectCard' || input.type === 'card') {
    return input.cards.filter((card) => card.isDisabled !== true).length;
  }
  if (input.type === 'or') {
    return input.options.reduce((sum, option) => sum + (option.type === 'player' ? option.players.length : 1), 0);
  }
  return undefined;
}
function selectTab(option: PlayerInputModel): void {
  handTabActive.value = false;
  if (!(actionsGrouped.value && option === props.binding.displayedOptions[groupIndex.value] && inActionsGroup.value)) {
    props.binding.select(option);
  }
}
function registerLabel(index: number, element: Element | ComponentPublicInstance | null): void {
  props.binding.registerLabel(index, element instanceof HTMLElement ? element : null);
}
</script>
