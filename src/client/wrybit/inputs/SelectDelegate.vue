<template>
  <div>
    <div v-if="binding.showtitle">{{ $t(binding.playerinput.title) }}</div>
    <label v-for="player in binding.playerinput.players" :key="player" class="form-radio form-inline">
      <input type="radio" :checked="binding.selected === player" :value="player" @change="binding.select(player)">
      <i class="form-icon"></i>
      <span v-if="player === 'NEUTRAL'" v-i18n>Neutral</span>
      <SelectPlayerRow v-else :player="binding.playerView.players.find((other) => other.color === player)"/>
    </label>
    <TabPanelFooterSlot>
      <AppButton v-if="binding.showsave" size="big" @click="binding.save()" :title="$t(binding.playerinput.buttonLabel)"/>
    </TabPanelFooterSlot>
  </div>
</template>

<script setup lang="ts">
import type {DelegateBinding} from './presentation';
import AppButton from '@/client/components/common/AppButton.vue';
import SelectPlayerRow from '@/client/components/SelectPlayerRow.vue';
import TabPanelFooterSlot from '@/client/wrybit/visuals/TabPanelFooterSlot.vue';

defineProps<{binding: DelegateBinding}>();
</script>
