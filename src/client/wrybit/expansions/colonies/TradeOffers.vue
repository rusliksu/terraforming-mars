<template>
  <div class="trade-colony__column trade-colony__column--wide">
    <div class="deal-step__label">{{ $t('Current trade track') }}</div>
    <div class="trade-colony__offers">
      <button v-for="colony in colonies" :key="colony.model.name" type="button"
        :class="['trade-colony__offer', {'deal-step__tile--on': binding.selected === colony.model.name, 'trade-colony__offer--off': !offered(colony.model.name)}]"
        :disabled="!offered(colony.model.name)" :data-test="'trade-offer-' + colony.model.name"
        :aria-pressed="binding.selected === colony.model.name" :title="$t(colony.metadata.trade.description)" @click="binding.select(colony.model.name)">
        <span class="trade-colony__offer-head">
          <span class="trade-colony__offer-planet"><ColonyPlanet :name="colony.model.name"/>
            <TradeShip v-if="colony.model.visitor !== undefined" class="trade-colony__offer-ship" :color="colony.model.visitor" :size="30"/>
          </span>
          <b>{{ $t(colony.model.name) }}</b>
        </span>
        <span class="trade-colony__gain">{{ colony.tradeValue ?? '—' }}<span :class="{'colonies-board__production': colony.tradeIcon.production}">
          <img v-if="colony.tradeIcon.src !== undefined" :src="'assets/' + colony.tradeIcon.src" alt=""><b v-else>{{ $t(colony.tradeIcon.label ?? '') }}</b>
        </span></span>
        <small>{{ $t(!colony.model.isActive ? 'inactive' : colony.model.visitor !== undefined ? 'taken' : colony.metadata.trade.description) }}</small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {ColonyChoiceBinding} from '@/client/wrybit/inputs/presentation';
import type {ColonyName} from '@/common/colonies/ColonyName';
import ColonyPlanet from '@/client/wrybit/inputs/colony/ColonyPlanet.vue';
import TradeShip from './TradeShip.vue';
import {colonyView} from './colonyView';

const props = defineProps<{binding: ColonyChoiceBinding}>();
const colonies = computed(() => props.binding.playerView.game.colonies.map(colonyView));
function offered(name: ColonyName): boolean {
  return props.binding.colonies.some((colony) => colony.model.name === name);
}
</script>
