<template>
  <div class="colonies-board colonies-board--classic">
    <div class="colonies-board__cards">
      <div v-for="colony in colonies" :key="colony.name" class="colonies-board__card" :data-test="'colony-tile-' + colony.name">
        <Colony :colony="colony" :active="colony.isActive" />
      </div>
    </div>
    <div class="colonies-board__hangar">
      <span class="colonies-board__hangar-label">
        <b>{{ $t('Fleets') }}</b>
        <small class="colonies-board__fee-label">{{ $t(viewer?.colonyTradeContext === undefined ? 'Base trade fee' : 'Trade fee') }}</small>
        <span class="colonies-board__fee">
          <span v-for="fee in fees" :key="fee.resource" :class="{'colonies-board__fee--off': !fee.available}" :data-test="'colony-fee-' + fee.resource">
            {{ fee.amount }}<img :src="'assets/' + FEE_ICON[fee.resource]" :alt="$t(fee.resource)">
          </span>
        </span>
      </span>
      <span class="colonies-board__berths">
        <span v-for="berth in berths" :key="berth.key" :class="['colonies-board__berth', {'colonies-board__berth--me': berth.color === viewer?.color}]">
          <TradeShip :color="berth.color" :size="28" />{{ berth.name }}
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Wrybit ColoniesBoard layout over our canonical public models and own trade context.
import {computed} from 'vue';
import type {ColonyModel} from '@/common/models/ColonyModel';
import type {PublicPlayerModel} from '@/common/models/PlayerModel';
import {MC_TRADE_COST, ENERGY_TRADE_COST, TITANIUM_TRADE_COST} from '@/common/constants';
import Colony from '@/client/components/colonies/Colony.vue';
import TradeShip from './TradeShip.vue';

const props = defineProps<{colonies: ReadonlyArray<ColonyModel>, players: ReadonlyArray<PublicPlayerModel>, viewer?: PublicPlayerModel}>();
const FEE_ICON = {megacredits: 'resources/megacredit.png', energy: 'resources/power.png', titanium: 'resources/titanium.png'};
const fees = computed(() => props.viewer?.colonyTradeContext?.payments ?? [
  {resource: 'megacredits' as const, amount: MC_TRADE_COST, available: true},
  {resource: 'energy' as const, amount: ENERGY_TRADE_COST, available: true},
  {resource: 'titanium' as const, amount: TITANIUM_TRADE_COST, available: true},
]);
const berths = computed(() => props.players.flatMap((player) => {
  // Only ships still in the hangar belong here. A ship at a colony is already drawn on that
  // colony tile; repeating it at the bottom looked like a second, available fleet.
  const away = props.colonies.filter((colony) => colony.visitor === player.color).length;
  const available = Math.max(0, player.fleetSize - away);
  return Array.from({length: available}, (_, index) => ({key: player.color + index,
    color: player.color, name: player.name}));
}));
</script>
