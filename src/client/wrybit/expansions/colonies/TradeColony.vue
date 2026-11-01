<template>
  <div class="trade-colony" data-test="trade-colony">
    <PresentationHost :hosts="binding.childHosts[0]" />
    <div class="deal-step__arrow" aria-hidden="true">↓</div>
    <PresentationHost :hosts="binding.childHosts[1]" />
    <div v-if="picked !== undefined && fee?.selectedOption !== undefined" class="trade-colony__receipt">
      <span class="trade-colony__receipt-line"><span class="trade-colony__pay">{{ $t(fullTabTitle(fee.selectedOption.title)) }}</span><i>→</i>
        <span class="trade-colony__get">{{ $t(picked.model.name) }} · {{ picked.tradeValue ?? '—' }}
          <img v-if="picked.tradeIcon.src !== undefined" :src="'assets/' + picked.tradeIcon.src" alt="">
          <b v-else>{{ $t(picked.tradeIcon.label ?? '') }}</b>
        </span>
      </span>
      <small>{{ $t('Current trade track') }} · {{ $t(picked.metadata.trade.description) }}</small>
      <small v-if="picked.model.colonies.length > 0">{{ $t('Colony bonus:') }} {{ owners }} · {{ $t(picked.metadata.colony.description) }}</small>
    </div>
    <div v-else class="trade-colony__receipt trade-colony__receipt--empty">{{ $t('Pick a colony …') }}</div>
    <TabPanelFooterSlot>
      <div v-if="binding.showsave" class="wf-action">
        <AppButton data-test="trade-submit" :title="binding.playerinput.buttonLabel" type="submit" size="normal" @click="binding.save()" :disabled="!canSave" />
      </div>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
// Wrybit deal layout; our two permanent child owners collect the actual native response.
import {computed, inject} from 'vue';
import type {AndOptionsBinding} from '@/client/wrybit/inputs/presentation';
import {COMPOSITE_PRESENTATION} from '@/client/wrybit/inputs/compositePresentation';
import {fullTabTitle} from '@/client/wrybit/inputs/orOptionsShortLabels';
import PresentationHost from '@/client/wrybit/inputs/PresentationHost.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import {colonyView} from './colonyView';

const props = defineProps<{binding: AndOptionsBinding}>();
const composite = inject(COMPOSITE_PRESENTATION, undefined);
const fee = computed(() => composite?.views.or.value?.value);
const selection = computed(() => composite?.views.colony.value?.value.selected);
const canSave = computed(() => props.binding.canSave && composite?.views.colony.value?.value.canSave === true && fee.value?.selectedOption !== undefined);
const picked = computed(() => {
  const model = props.binding.playerView.game.colonies.find((colony) => colony.name === selection.value);
  return model === undefined ? undefined : colonyView(model);
});
const owners = computed(() => picked.value?.model.colonies.map((color) =>
  props.binding.playerView.players.find((player) => player.color === color)?.name ?? color).join(', '));
</script>
