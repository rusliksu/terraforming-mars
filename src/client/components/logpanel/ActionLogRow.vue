<template>
  <li class="action-log-row" data-test="action-log-row">
    <div class="action-log-summary">
      <ul class="action-log-title">
        <LogMessageComponent :message="entry.messages[0]" :viewModel="viewModel"
          @click="$emit('messageClicked', entry.messages[0])" @spaceClicked="$emit('spaceClicked', $event)"/>
      </ul>
      <div class="action-log-effects">
        <span v-for="payment in payments" :key="payment.key" class="action-log-payment"
          :aria-label="`Paid ${payment.amount} ${payment.resource}`" :title="`Paid ${payment.amount} ${payment.resource}`">
          <span class="action-log-effect-amount">−{{ payment.amount }}</span>
          <i class="resource_icon" :class="'resource_icon--' + payment.resource" aria-hidden="true"></i>
        </span>
        <span v-for="(summary, index) in effects" :key="index" class="action-log-effect"
          :aria-label="effectLabel(summary)" :title="effectLabel(summary)">
          <span class="action-log-effect-visual" :class="{'production-box action-log-production-box': summary.effect.kind === 'resource' && summary.effect.production}">
            <span class="action-log-effect-amount">{{ effectAmount(summary.effect) }}</span>
            <i v-if="summary.effect.kind === 'resource'" class="resource_icon" :class="'resource_icon--' + summary.effect.resource" aria-hidden="true"></i>
            <i v-else-if="summary.effect.kind === 'tr'" class="resource_icon resource_icon--rating" aria-hidden="true"></i>
            <img v-else class="action-log-global-icon"
              :src="'/assets/global-parameters/' + summary.effect.parameter + '.png'" alt="" aria-hidden="true">
          </span>
          <span v-if="summary.oceanCount !== undefined" class="action-log-source" aria-hidden="true">🌊×{{ summary.oceanCount }}</span>
          <span v-if="differentPlayer(summary.effect.player)" class="log-player action-log-target"
            :class="playerColorClass(summary.effect.player, 'bg')">{{ playerName(summary.effect.player) }}</span>
        </span>
        <button v-for="spaceId in locations" :key="spaceId" type="button" class="action-log-location"
          :title="getSpaceName(spaceId)" @click="$emit('spaceClicked', spaceId)">
          ⌖ {{ getSpaceName(spaceId) }}
        </button>
      </div>
      <button v-if="entry.messages.length > 1" type="button" class="action-log-details"
        :aria-expanded="expanded" @click="expanded = !expanded">
        {{ $t(expanded ? 'Hide details' : 'Show details') }}
      </button>
      <span v-if="!entry.complete" class="action-log-incomplete" v-i18n>Action continues</span>
    </div>
    <ul v-if="expanded" class="action-log-detail-list">
      <LogMessageComponent v-for="(message, index) in entry.messages.slice(1)" :key="index"
        :message="message" :viewModel="viewModel" @click="$emit('messageClicked', message)"
        @spaceClicked="$emit('spaceClicked', $event)"/>
    </ul>
  </li>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import {ActionLogEntry} from '@/common/logs/ActionLog';
import {LogEffect, LogGlobalEffect} from '@/common/logs/LogMessage';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {Color} from '@/common/Color';
import {Resource} from '@/common/Resource';
import {GlobalParameter} from '@/common/GlobalParameter';
import {SpaceId} from '@/common/Types';
import {playerColorClass} from '@/common/utils/utils';
import {getSpaceName} from '@/common/boards/spaces';
import {ViewModel} from '@/common/models/PlayerModel';
import LogMessageComponent from './LogMessageComponent.vue';

const props = defineProps<{
  entry: Extract<ActionLogEntry, {kind: 'action'}>;
  viewModel: ViewModel;
}>();

defineEmits<{
  messageClicked: [message: LogMessage];
  spaceClicked: [spaceId: SpaceId];
}>();

const expanded = ref(false);
type EffectSummary = {effect: LogEffect | LogGlobalEffect, oceanCount?: number};
const payments = computed(() => props.entry.messages.flatMap((message, messageIndex) => {
  const payment = message.payment;
  if (payment === undefined) {
    return [];
  }
  return ([Resource.MEGACREDITS, Resource.STEEL, Resource.TITANIUM, Resource.ENERGY] as const)
    .map((resource) => ({key: `${messageIndex}-${resource}`, resource, amount: payment[resource] ?? 0}))
    .filter(({amount}) => Number.isSafeInteger(amount) && amount > 0);
}));
const effects = computed(() => props.entry.messages.flatMap((message): Array<EffectSummary> => {
  const result: Array<EffectSummary> = (message.replayGlobalEffects ?? []).map((effect) => ({effect}));
  if (message.effect !== undefined) {
    result.unshift({effect: message.effect});
    return result;
  }
  const oceanBonus = oceanBonusEffect(message);
  if (oceanBonus !== undefined) {
    result.unshift(oceanBonus);
  }
  return result;
}));
const locations = computed(() => Array.from(new Set(props.entry.messages.slice(1).flatMap((message) =>
  message.data.flatMap((datum) => datum.type === LogMessageDataType.SPACE ? [datum.value] : [])))).filter((id) => getSpaceName(id) !== 'n/a'));
const actor = computed(() => props.entry.messages[0].data.find((datum) => datum.type === LogMessageDataType.PLAYER)?.value);

function playerName(color: Color): string {
  return props.viewModel.players.find((player) => player.color === color)?.name ?? color;
}

function differentPlayer(color: Color): boolean {
  return actor.value === undefined || actor.value !== color;
}

function effectLabel({effect, oceanCount}: EffectSummary): string {
  if (effect.kind === 'global') {
    const name = effect.parameter === GlobalParameter.OXYGEN ? 'oxygen' :
      effect.parameter === GlobalParameter.TEMPERATURE ? 'temperature' : 'Venus scale';
    return `${effectAmount(effect)} ${name} · ${playerName(effect.player)}`;
  }
  const type = effect.kind === 'tr' ? 'TR' : `${effect.resource}${effect.production ? ' production' : ''}`;
  const source = oceanCount === undefined ? '' : ` from ${oceanCount} ocean(s)`;
  return `${effect.amount > 0 ? '+' : ''}${effect.amount} ${type}${source} · ${playerName(effect.player)}`;
}

function effectAmount(effect: LogEffect | LogGlobalEffect): string {
  const amount = effect.kind === 'global' && effect.parameter !== GlobalParameter.OXYGEN ? effect.amount * 2 : effect.amount;
  const suffix = effect.kind === 'global' ? effect.parameter === GlobalParameter.TEMPERATURE ? '°C' : '%' : '';
  return `${amount > 0 ? '+' : ''}${amount}${suffix}`;
}

function oceanBonusEffect(message: LogMessage): EffectSummary | undefined {
  if (message.message !== '${0} gained ${1} M€ from ${2} ocean(s)' || message.data.length !== 3 ||
      message.data[0].type !== LogMessageDataType.PLAYER ||
      message.data[1].type !== LogMessageDataType.RAW_STRING ||
      message.data[2].type !== LogMessageDataType.RAW_STRING) {
    return undefined;
  }
  const amount = Number(message.data[1].value);
  const oceanCount = Number(message.data[2].value);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return undefined;
  }
  return {
    effect: {kind: 'resource', resource: Resource.MEGACREDITS, production: false, amount, player: message.data[0].value},
    oceanCount: Number.isSafeInteger(oceanCount) && oceanCount > 0 ? oceanCount : undefined,
  };
}
</script>

<style scoped>
.action-log-row { margin: 4px 0; padding: 5px 8px; border-left: 3px solid #5a5ad0; background: #303036; overflow-wrap: anywhere; }
.action-log-summary, .action-log-effects { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 9px; }
.action-log-title, .action-log-detail-list { padding: 0; margin: 0; list-style: none; }
.action-log-title { flex: 1 1 290px; min-width: 0; font-weight: bold; }
.action-log-effects { flex: 2 1 280px; min-width: 0; }
.action-log-effect, .action-log-payment { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.action-log-payment { color: #e9c8b4; }
.action-log-effect-visual { display: inline-flex; align-items: center; gap: 4px; }
.action-log-effect-amount { font-weight: bold; }
.action-log-global-icon { display: block; width: auto; height: 24px; max-width: 32px; object-fit: contain; }
.action-log-effect .resource_icon, .action-log-payment .resource_icon { display: inline-block; width: 21px; height: 21px; background-size: contain; }
.action-log-effect .action-log-production-box { min-width: 52px; width: auto; height: 29px; padding: 2px 5px; margin: 0; line-height: normal; box-sizing: border-box; color: #fff; }
.action-log-source { font-size: 0.8em; color: #b8d9f2; }
.action-log-location { border: 1px solid #999; border-radius: 4px; background: #42424a; color: inherit; cursor: pointer; white-space: nowrap; }
.action-log-location:focus-visible { outline: 2px solid #ffc567; }
.action-log-incomplete { font-size: 0.8em; color: #bbb; }
.action-log-details { border: 1px solid #999; border-radius: 4px; background: transparent; color: inherit; cursor: pointer; }
.action-log-details:focus-visible { outline: 2px solid #ffc567; }
.action-log-detail-list { margin-top: 6px; padding-left: 10px; border-left: 1px solid #777; }
</style>
