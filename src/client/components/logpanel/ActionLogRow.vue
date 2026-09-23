<template>
  <li class="action-log-row" data-test="action-log-row">
    <div class="action-log-summary">
      <ul class="action-log-title">
        <LogMessageComponent :message="entry.messages[0]" :viewModel="viewModel"
          @click="$emit('messageClicked', entry.messages[0])" @spaceClicked="$emit('spaceClicked', $event)"/>
      </ul>
      <div class="action-log-effects">
        <span v-for="(effect, index) in effects" :key="index" class="action-log-effect"
          :aria-label="effectLabel(effect)" :title="effectLabel(effect)">
          <span class="action-log-effect-visual" :class="{'production-box action-log-production-box': effect.kind === 'resource' && effect.production}">
            <span class="action-log-effect-amount">{{ effect.amount > 0 ? '+' : '' }}{{ effect.amount }}</span>
            <i v-if="effect.kind === 'resource'" class="resource_icon" :class="'resource_icon--' + effect.resource" aria-hidden="true"></i>
            <i v-else class="resource_icon resource_icon--rating" aria-hidden="true"></i>
          </span>
          <span v-if="differentPlayer(effect.player)" class="action-log-target">{{ playerName(effect.player) }}</span>
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
import {LogEffect} from '@/common/logs/LogMessage';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {Color} from '@/common/Color';
import {Resource} from '@/common/Resource';
import {SpaceId} from '@/common/Types';
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
const effects = computed(() => props.entry.messages.flatMap((message) => {
  const effect = message.effect ?? oceanBonusEffect(message);
  return effect === undefined ? [] : [effect];
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

function effectLabel(effect: LogEffect): string {
  const type = effect.kind === 'tr' ? 'TR' : `${effect.resource}${effect.production ? ' production' : ''}`;
  return `${effect.amount > 0 ? '+' : ''}${effect.amount} ${type} · ${playerName(effect.player)}`;
}

function oceanBonusEffect(message: LogMessage): LogEffect | undefined {
  if (message.message !== '${0} gained ${1} M€ from ${2} ocean(s)' || message.data.length !== 3 ||
      message.data[0].type !== LogMessageDataType.PLAYER ||
      message.data[1].type !== LogMessageDataType.RAW_STRING ||
      message.data[2].type !== LogMessageDataType.RAW_STRING) {
    return undefined;
  }
  const amount = Number(message.data[1].value);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return undefined;
  }
  return {kind: 'resource', resource: Resource.MEGACREDITS, production: false, amount, player: message.data[0].value};
}
</script>

<style scoped>
.action-log-row { margin: 4px 0; padding: 5px 8px; border-left: 3px solid #5a5ad0; background: #303036; overflow-wrap: anywhere; }
.action-log-summary, .action-log-effects { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 9px; }
.action-log-title, .action-log-detail-list { padding: 0; margin: 0; list-style: none; }
.action-log-title { flex: 1 1 290px; min-width: 0; font-weight: bold; }
.action-log-effects { flex: 2 1 280px; min-width: 0; }
.action-log-effect { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.action-log-effect-visual { display: inline-flex; align-items: center; gap: 4px; }
.action-log-effect-amount { font-weight: bold; }
.action-log-effect .resource_icon { display: inline-block; width: 21px; height: 21px; background-size: contain; }
.action-log-effect .action-log-production-box { min-width: 52px; width: auto; height: 29px; padding: 2px 5px; margin: 0; line-height: normal; box-sizing: border-box; color: #fff; }
.action-log-location { border: 1px solid #999; border-radius: 4px; background: #42424a; color: inherit; cursor: pointer; white-space: nowrap; }
.action-log-location:focus-visible { outline: 2px solid #ffc567; }
.action-log-target, .action-log-incomplete { font-size: 0.8em; color: #bbb; }
.action-log-details { border: 1px solid #999; border-radius: 4px; background: transparent; color: inherit; cursor: pointer; }
.action-log-details:focus-visible { outline: 2px solid #ffc567; }
.action-log-detail-list { margin-top: 6px; padding-left: 10px; border-left: 1px solid #777; }
</style>
