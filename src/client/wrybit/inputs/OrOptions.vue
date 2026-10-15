<template>
  <div :class="['wf-options', {'wf-options--tabs': binding.asTabs}]" data-source-or>
    <label v-if="binding.showtitle && !binding.asTabs"><div>{{ $t(binding.playerinput.title) }}</div></label>
    <label v-if="binding.playerinput.warning !== undefined" class="card-warning"><div>({{ $t(binding.playerinput.warning) }})</div></label>
    <div v-if="binding.asTabs" class="or-tabs" role="tablist">
      <HandCardsTab :count="handCount" :active="handTabActive" @select="handTabActive = true"/>
      <button v-for="idx in tabOrder" :key="idx" type="button" role="tab"
        :ref="(el) => registerLabel(idx, el)"
        :data-option-index="idx" :title="$t(fullTabTitle(binding.displayedOptions[idx].title))"
        :aria-selected="!handTabActive && binding.selectedIdx === idx"
        :class="['or-tab', toneClass('or-tab--tone-', binding.displayedOptions[idx]), {'or-tab--active': !handTabActive && binding.selectedIdx === idx, 'or-tab--empty': availableCount(binding.displayedOptions[idx]) === 0, 'or-tab--highlight': tabHighlighted(binding.displayedOptions[idx].title), 'or-tab--end': isEndTab(binding.displayedOptions[idx].title)}]"
        @click="selectTab(binding.displayedOptions[idx])">
        <OrOptionsTabIcon v-for="icon in iconsFor(idx)" :key="icon" :icon="icon"/>
        <span class="or-tab-title">{{ $t(shortTabLabel(binding.displayedOptions[idx].title)) }}</span>
        <span v-if="availableCount(binding.displayedOptions[idx]) !== undefined" class="or-tab-count">{{ availableCount(binding.displayedOptions[idx]) }}</span>
      </button>
    </div>
    <div :class="[{'or-tab-panel': binding.asTabs, 'or-tab-panel--view': binding.asTabs && handTabActive, 'or-tab-panel--end': !handTabActive && binding.selectedOption !== undefined && isEndTab(binding.selectedOption.title)}, !handTabActive && binding.selectedOption ? toneClass('or-tab-panel--tone-', binding.selectedOption) : undefined]" :role="binding.asTabs ? 'tabpanel' : undefined">
      <HandCardsPanel v-if="binding.asTabs && handTabActive" :playerView="binding.playerView"/>
      <template v-if="!binding.asTabs">
        <div v-for="(option, idx) in binding.displayedOptions" :key="idx">
          <label class="form-radio" :ref="(el) => registerLabel(idx, el)">
            <input type="radio" :name="binding.radioElementName" :value="idx" :checked="binding.selectedIdx === idx" @change="binding.select(option)">
            <i class="form-icon"></i><span>{{ $t(option.title) }}</span>
          </label>
          <PresentationHost v-if="binding.selectedIdx === idx" :hosts="binding.childHost" style="margin-left: 30px"/>
        </div>
      </template>
      <PresentationHost v-if="binding.asTabs" v-show="!handTabActive" :hosts="binding.childHost"/>
      <p v-if="binding.asTabs && !handTabActive && binding.selectedOption && endTabHint(binding.selectedOption.title) !== undefined" class="or-tab-end-hint">{{ $t(endTabHint(binding.selectedOption.title) ?? '') }}</p>
      <div v-if="binding.asTabs" v-show="!handTabActive" class="or-tab-footer">
        <PresentationHost :hosts="binding.footerHost"/>
        <ActionStepChips v-if="turnStep !== undefined" :step="turnStep"/>
        <div v-if="showSave" :class="['wf-action', 'or-tab-save', binding.selectedOption ? toneClass('or-tab-save--', binding.selectedOption) : undefined]"><AppButton :title="$t(saveLabel)" type="submit" @click="binding.save()"/></div>
      </div>
      <TabPanelFooterSlot v-else-if="showSave">
        <div class="wf-action or-options-save"><AppButton :title="$t(binding.selectedOption?.buttonLabel ?? '')" type="submit" @click="binding.save()"/></div>
      </TabPanelFooterSlot>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
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

const props = defineProps<{binding: OrOptionsBinding}>();
const handTabActive = ref(false);
const handCount = computed(() => allCardsInHand(props.binding.playerView).length);
const showSave = computed(() => props.binding.showsave && props.binding.selectedOption !== undefined && !props.binding.showChildSaveButton(props.binding.selectedOption));
// Source visual ordering only; the canonical controller retains original response indices.
const tabOrder = computed(() => tabDisplayOrder(props.binding.displayedOptions.map((option) => option.title)));
const turnStep = computed(() => actionStep(props.binding.playerinput));
const saveLabel = computed(() => props.binding.selectedOption ? tabButtonLabel(props.binding.selectedOption.title, props.binding.selectedOption.buttonLabel) : '');
function iconsFor(index: number): Array<TabIcon> {
  const icon = tabIcon(props.binding.displayedOptions[index].title);
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
  props.binding.select(option);
}
function registerLabel(index: number, element: Element | ComponentPublicInstance | null): void {
  props.binding.registerLabel(index, element instanceof HTMLElement ? element : null);
}
</script>
