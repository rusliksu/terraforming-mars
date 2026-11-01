<template>
  <div v-if="hasWaitingForTabs(binding.playerinput)" class="wf-options wf-options--tabs" data-source-waiting>
    <div class="or-tabs" role="tablist">
      <HandCardsTab :count="handCount" :active="handTabActive" @select="handTabActive = true" />
      <button type="button" role="tab" data-input-tab data-hotkey="tab-actions" :title="$t(fullTabTitle(binding.playerinput.title))" :aria-selected="!handTabActive"
        :class="['or-tab', {'or-tab--active': !handTabActive}, tone === undefined ? undefined : 'or-tab--tone-' + tone]" @click="handTabActive = false">
        <span class="or-tab-title">{{ $t(inputTabLabel(binding.playerinput)) }}</span>
        <span v-if="count !== undefined" class="or-tab-count">{{ count }} options</span>
        <HotkeyKeys action="tab-actions" />
      </button>
      <WaitingForPlayersTab v-if="binding.playerinput.optional" :playerView="binding.playerView" />
    </div>
    <div v-docked-tab :class="['or-tab-panel', {'or-tab-panel--view': handTabActive}, !handTabActive && tone !== undefined ? 'or-tab-panel--tone-' + tone : undefined]" role="tabpanel">
      <template v-if="handTabActive">
        <HandCardsPanel v-if="cards.length > 0 || dealt.length === 0" :playerView="binding.playerView" />
        <CardListSection v-for="section in dealt" :key="section.title" :title="section.title" :cards="section.cards" />
      </template>
      <PresentationHost v-show="!handTabActive" :hosts="binding.bodyHost" />
      <PresentationHost v-show="!handTabActive" class="or-tab-footer" :hosts="binding.footerHost"><CancelActionButton /></PresentationHost>
    </div>
  </div>
  <PresentationHost v-else :hosts="binding.bodyHost" />
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import type {InputPresentationBindings} from './presentation';
import PresentationHost from './PresentationHost.vue';
import HandCardsTab from '@/client/wrybit/visuals/HandCardsTab.vue';
import HandCardsPanel from '@/client/wrybit/visuals/HandCardsPanel.vue';
import CardListSection from '@/client/wrybit/visuals/CardListSection.vue';
import {vDockedTab} from '@/client/wrybit/visuals/common/DockedTab';
import {allCardsInHand} from '@/client/wrybit/visuals/cardfilter/handCards';
import {fullTabTitle, inputTabLabel, optionTone} from './orOptionsShortLabels';
import {hasWaitingForTabs, initialDraftDealtSections} from './waitingForTabs';
import WaitingForPlayersTab from './WaitingForPlayersTab.vue';
import {spaceWithSkip} from './spaceWithSkip';
import CancelActionButton from './CancelActionButton.vue';
import HotkeyKeys from '@/client/components/hotkeys/HotkeyKeys.vue';

const props = defineProps<{binding: InputPresentationBindings['waitingFor']}>();
const handTabActive = ref(false);
watch(() => props.binding.playerinput, () => {
  handTabActive.value = false;
});
const cards = computed(() => allCardsInHand(props.binding.playerView));
const dealt = computed(() => initialDraftDealtSections(props.binding.playerView));
const handCount = computed(() => cards.value.length + dealt.value.reduce((sum, section) => sum + section.cards.length, 0));
const tone = computed(() => {
  const input = props.binding.playerinput;
  return optionTone(input.type === 'or' ? spaceWithSkip(input)?.space ?? input : input);
});
const count = computed(() => {
  const input = props.binding.playerinput;
  if (input.type === 'card' || input.type === 'projectCard') {
    return input.cards.filter((card) => !card.isDisabled).length;
  }
  if (input.type === 'or') {
    if (spaceWithSkip(input) !== undefined) {
      return undefined;
    }
    return input.options.reduce((sum, option) => sum + (option.type === 'player' ? option.players.length : 1), 0);
  }
  return undefined;
});
</script>

<style scoped>
[data-source-waiting] :deep(.wf-waiting-status) { display: none; }
</style>
