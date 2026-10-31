<template>
  <div class="colonies-board">
    <div v-for="colony in views" :key="colony.model.name"
      :class="['colonies-board__tile', {'colonies-board__tile--off': !colony.model.isActive, 'colonies-board__tile--docked': colony.model.visitor !== undefined}]"
      :style="{'--planet-tone': colony.tone}" :data-test="'colony-tile-' + colony.model.name">
      <span class="colonies-board__art"><ColonyPlanet :name="colony.model.name" /></span>
      <div class="colonies-board__body">
        <div class="colonies-board__head">
          <b class="colonies-board__name">{{ $t(colony.model.name) }}</b>
          <span class="colonies-board__meta">
            <span>{{ $t('Build:') }} <b>{{ $t(colony.metadata.build.description) }}</b></span>
            <span>{{ $t('Colony bonus:') }} <b>{{ $t(colony.metadata.colony.description) }}</b></span>
          </span>
        </div>
        <div class="colonies-board__track" :style="{gridTemplateColumns: 'repeat(' + colony.cells.length + ', minmax(0, 1fr))'}">
          <span v-for="cell in colony.cells" :key="cell.index" class="colonies-board__cell">
            <span :class="['colonies-board__step', {'colonies-board__step--slot': cell.slot,
                                                    'colonies-board__step--colony': cell.owner !== undefined,
                                                    'colonies-board__step--at': cell.index === colony.model.trackPosition && cell.owner === undefined,
                                                    'colonies-board__step--past': cell.index < colony.model.trackPosition && cell.owner === undefined}]">
              <PlayerCube v-if="cell.owner !== undefined" :color="cell.owner" view="slight" :size="13" />
              <template v-else>
                <b>{{ cell.value }}</b>
                <img v-if="cell.index === colony.model.trackPosition && colony.tradeIcon.src !== undefined" class="colonies-board__step-icon" :src="'assets/' + colony.tradeIcon.src" alt="">
              </template>
            </span>
          </span>
        </div>
      </div>
      <div class="colonies-board__value" :title="$t(colony.metadata.trade.description)">
        <span v-if="colony.model.visitor !== undefined" class="colonies-board__docked">
          <TradeShip :color="colony.model.visitor" :size="30" />{{ playerName(colony.model.visitor) }}
        </span>
        <span class="colonies-board__big">{{ colony.tradeValue ?? '—' }}<span :class="{'colonies-board__production': colony.tradeIcon.production}">
          <img v-if="colony.tradeIcon.src !== undefined" :src="'assets/' + colony.tradeIcon.src" alt=""><b v-else>{{ $t(colony.tradeIcon.label ?? '') }}</b>
        </span></span>
        <small>{{ $t(!colony.model.isActive ? 'inactive' : colony.model.visitor !== undefined ? 'taken' : 'Trade track') }}</small>
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
        <span v-for="berth in berths" :key="berth.key" :class="['colonies-board__berth', {'colonies-board__berth--away': berth.away !== undefined, 'colonies-board__berth--me': berth.color === viewer?.color}]">
          <TradeShip :color="berth.color" :size="28" />{{ berth.name }}<small v-if="berth.away !== undefined">→ {{ $t(berth.away) }}</small>
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
import type {Color} from '@/common/Color';
import {MC_TRADE_COST, ENERGY_TRADE_COST, TITANIUM_TRADE_COST} from '@/common/constants';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import ColonyPlanet from '@/client/wrybit/inputs/colony/ColonyPlanet.vue';
import TradeShip from './TradeShip.vue';
import {colonyView} from './colonyView';

const props = defineProps<{colonies: ReadonlyArray<ColonyModel>, players: ReadonlyArray<PublicPlayerModel>, viewer?: PublicPlayerModel}>();
const FEE_ICON = {megacredits: 'resources/megacredit.png', energy: 'resources/power.png', titanium: 'resources/titanium.png'};
const views = computed(() => props.colonies.map(colonyView));
const fees = computed(() => props.viewer?.colonyTradeContext?.payments ?? [
  {resource: 'megacredits' as const, amount: MC_TRADE_COST, available: true},
  {resource: 'energy' as const, amount: ENERGY_TRADE_COST, available: true},
  {resource: 'titanium' as const, amount: TITANIUM_TRADE_COST, available: true},
]);
const berths = computed(() => props.players.flatMap((player) => {
  const away = props.colonies.filter((colony) => colony.visitor === player.color).map((colony) => colony.name);
  return Array.from({length: Math.max(player.fleetSize, away.length)}, (_, index) => ({key: player.color + index,
    color: player.color, name: player.name, away: away[index]}));
}));
function playerName(color: Color): string {
  return props.players.find((player) => player.color === color)?.name ?? color;
}
</script>
