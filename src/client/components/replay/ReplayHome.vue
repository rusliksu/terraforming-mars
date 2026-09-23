<template>
  <main class="replay-home">
    <header class="replay-heading">
      <p class="replay-back-row">
        <a class="replay-back tooltip tooltip-bottom" :href="'/spectator?id=' + encodeURIComponent(spectatorId)"
          :data-tooltip="$t('Back to the game page, where the lobby lists every player link')" v-i18n>Back to game</a>
      </p>
      <h1><span v-i18n>Game replay</span><span v-if="state.index?.name"> · {{ state.index.name }}</span></h1>
      <p v-i18n>Public saved states. Some actions may fall between saves.</p>
    </header>

    <section class="replay-controls" :aria-label="$t('Replay controls')">
      <div class="replay-buttons">
        <button class="btn" :disabled="count === 0 || state.position === 0" @click="seek(0)" :aria-label="$t('First save')">⏮</button>
        <button class="btn" :disabled="count === 0 || state.position === 0" @click="seek(state.position - 1)" :aria-label="$t('Previous save')">◀</button>
        <button class="btn btn-primary replay-play"
          :disabled="!state.playing && (state.loading || state.frame === undefined || atEnd)"
          @click="state.playing ? pause() : play()">{{ $t(state.playing ? 'Pause replay' : 'Play replay') }}</button>
        <button class="btn" :disabled="count === 0 || atEnd" @click="seek(state.position + 1)" :aria-label="$t('Next save')">▶</button>
        <button class="btn" :disabled="count === 0 || atEnd" @click="seek(count - 1)" :aria-label="$t('Last save')">⏭</button>
        <label class="replay-speed"><span v-i18n>Replay speed</span>
          <select :value="state.speed" @change="setSpeed(Number(($event.target as HTMLSelectElement).value))">
            <option v-for="speed in [0.5, 1, 2, 4]" :key="speed" :value="speed">{{ speed }}×</option>
          </select>
        </label>
      </div>
      <label class="replay-position">
        <span><span v-i18n>Saved state</span> {{ count === 0 ? 0 : state.position + 1 }} / {{ count }}</span>
        <input type="range" min="0" :max="Math.max(0, count - 1)" step="1" :value="state.position"
          :disabled="count < 2" :aria-label="$t('Saved state')"
          @input="seek(Number(($event.target as HTMLInputElement).value))">
      </label>
      <p v-if="state.loading" class="replay-status" role="status" v-i18n>Loading replay...</p>
      <p v-else-if="state.frame" class="replay-status" role="status">
        <span v-i18n>Generation</span> {{ state.frame.view.game.generation }} ·
        <span v-i18n>{{ state.frame.view.game.phase }}</span> ·
        <span v-i18n>Save ID</span> {{ state.frame.saveId }}
      </p>
    </section>

    <div v-if="state.error" class="replay-error" role="alert">
      <p v-i18n>Replay unavailable. The game may have changed or its history cannot be read.</p>
      <button class="btn" @click="initialize()" v-i18n>Retry replay</button>
    </div>
    <p v-else-if="state.index && count === 0" role="status" v-i18n>No saved states are available.</p>

    <div v-if="state.frame" class="replay-frame" :data-replay-save="state.frame.saveId">
      <section class="replay-log" :aria-label="$t('Saved public log')">
        <LogGenerationList :max="state.frame.view.game.generation" :selected="selectedGeneration ?? state.frame.view.game.generation"
          :lastSoloGeneration="state.frame.view.players.length === 1 ? state.frame.view.game.lastSoloGeneration : undefined"
          @selected="selectedGeneration = $event">
          <template #title><h2 v-i18n>Game log</h2></template>
          <template #after-generations>
            <button type="button" class="log-recent-indicator" :class="{'log-recent-indicator--selected': selectedGeneration === -1}"
              @click="selectedGeneration = -1" v-i18n>Last 100</button>
          </template>
        </LogGenerationList>
        <div class="log-player-filters" v-if="state.frame.view.players.length > 1">
          <button type="button" class="log-player-filter" :class="{'log-player-filter--selected': selectedPlayerColor === undefined}"
            :aria-pressed="selectedPlayerColor === undefined" @click="selectedPlayerColor = undefined" v-i18n>All</button>
          <button v-for="player in state.frame.view.players" :key="player.color" type="button"
            class="log-player-filter log-player-filter--player" :class="[playerColorClass(player.color, 'bg'), {'log-player-filter--selected': selectedPlayerColor === player.color}]"
            :aria-pressed="selectedPlayerColor === player.color" @click="selectedPlayerColor = player.color">{{ player.name }}</button>
        </div>
        <div v-if="latestEntry" class="replay-current-log">
          <h3 v-i18n>Latest event in view</h3>
          <ul>
            <ActionLogRow v-if="latestEntry.kind === 'action'" :entry="latestEntry" :viewModel="state.frame.view"
              @messageClicked="messageClicked" @spaceClicked="spaceClicked"/>
            <LogMessageComponent v-else :message="latestEntry.message" :viewModel="state.frame.view"
              @click="messageClicked(latestEntry.message)" @spaceClicked="spaceClicked"/>
          </ul>
        </div>
        <ul class="replay-log-history">
          <template v-for="(entry, index) in earlierEntries" :key="entry.kind === 'action' ? entry.id : entry.message.timestamp + '-' + index">
            <ActionLogRow v-if="entry.kind === 'action'" :entry="entry" :viewModel="state.frame.view"
              @messageClicked="messageClicked" @spaceClicked="spaceClicked"/>
            <LogMessageComponent v-else :message="entry.message" :viewModel="state.frame.view"
              @click="messageClicked(entry.message)" @spaceClicked="spaceClicked"/>
          </template>
        </ul>
        <p v-if="filteredMessages.length === 0" v-i18n>No public messages in this save.</p>
      </section>
      <div v-if="selectedMessage" class="replay-card-overlay" @click.self="selectedMessage = undefined">
        <CardPanel :message="selectedMessage" :players="state.frame.view.players" @hide="selectedMessage = undefined"/>
      </div>
      <div class="replay-players">
        <PlayersOverview :playerView="state.frame.view" :readOnly="true"/>
      </div>
      <div class="replay-board">
        <div class="replay-board-inner" data-test="replay-board-inner">
          <GameBoardView :game="state.frame.view.game" :players="state.frame.view.players" :tileView="tileView"
            @toggleTileView="tileView = nextTileView(tileView)"/>
        </div>
      </div>
      <section v-if="state.frame.view.game.colonies.length > 0" class="replay-colonies">
        <h2 v-i18n>Colonies</h2>
        <Colony v-for="colony in state.frame.view.game.colonies" :key="colony.name" :colony="colony" :active="colony.isActive"/>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import GameBoardView from '@/client/components/GameBoardView.vue';
import PlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import Colony from '@/client/components/colonies/Colony.vue';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import CardPanel from '@/client/components/logpanel/CardPanel.vue';
import LogGenerationList from '@/client/components/logpanel/LogGenerationList.vue';
import ActionLogRow from '@/client/components/logpanel/ActionLogRow.vue';
import {ActionLogEntry, groupActionLogs} from '@/common/logs/ActionLog';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {Color} from '@/common/Color';
import {SpaceId} from '@/common/Types';
import {playerColorClass} from '@/common/utils/utils';
import {TileView, nextTileView} from '@/client/components/board/TileView';
import {useReplay} from './useReplay';

const spectatorId = new URLSearchParams(window.location.search).get('id') ?? '';
const {state, initialize, seek, play, pause, setSpeed} = useReplay(spectatorId);
const tileView = ref<TileView>('show');
const count = computed(() => state.index?.saveIds.length ?? 0);
const atEnd = computed(() => state.position >= count.value - 1);
const selectedGeneration = ref<number | undefined>(undefined);
const selectedPlayerColor = ref<Color | undefined>(undefined);
const selectedMessage = ref<LogMessage | undefined>(undefined);
const filteredMessages = computed((): Array<LogMessage> => {
  const frame = state.frame;
  if (frame === undefined) {
    return [];
  }
  const logs = selectedGeneration.value === -1 ? frame.logs.slice(-100) : logsForGeneration(frame.logs, selectedGeneration.value ?? frame.view.game.generation);
  if (selectedPlayerColor.value === undefined) {
    return [...logs];
  }
  return logs.filter((message) => message.type === LogMessageType.NEW_GENERATION ||
    message.data.some((datum) => datum.type === LogMessageDataType.PLAYER && datum.value === selectedPlayerColor.value));
});
const displayEntries = computed(() => groupActionLogs(filteredMessages.value));
const latestEntry = computed(() => displayEntries.value.at(-1));
const earlierEntries = computed((): Array<ActionLogEntry> => displayEntries.value.slice(0, -1));

watch(() => state.frame?.view.game.generation, (generation, previous) => {
  if (generation !== undefined && (selectedGeneration.value === undefined || selectedGeneration.value === previous || selectedGeneration.value > generation)) {
    selectedGeneration.value = generation;
  }
});
watch(() => state.frame?.saveId, () => {
  selectedMessage.value = undefined;
});

function logsForGeneration(logs: ReadonlyArray<LogMessage>, generation: number): Array<LogMessage> {
  let foundStart = generation === 1;
  const result: Array<LogMessage> = [];
  for (const message of logs) {
    if (message.type === LogMessageType.NEW_GENERATION && message.canceled !== true) {
      const value = Number(message.data[0]?.value);
      if (value === generation) {
        foundStart = true;
      } else if (value === generation + 1) {
        break;
      }
    }
    if (foundStart) {
      result.push(message);
    }
  }
  return result;
}

function messageClicked(message: LogMessage) {
  if (message.data.some((datum) => datum.type === LogMessageDataType.CARD ||
      datum.type === LogMessageDataType.CARDS && datum.value.length > 0 ||
      datum.type === LogMessageDataType.GLOBAL_EVENT || datum.type === LogMessageDataType.COLONY)) {
    selectedMessage.value = message;
  }
}

function spaceClicked(_spaceId: SpaceId) {
  document.querySelector('.replay-board')?.scrollIntoView({behavior: 'smooth', block: 'center'});
}
onMounted(initialize);
</script>

<style scoped>
.replay-home { width: 100%; min-width: 0; margin: 0 auto; padding: 16px; box-sizing: border-box; }
.replay-heading h1 { font-size: 24px; overflow-wrap: anywhere; }
.replay-heading p { color: #bbb; }
.replay-back-row { margin: 0 0 8px; }
.replay-back { text-decoration: underline; }
.replay-controls { position: sticky; top: 0; z-index: 20; padding: 12px; background: #242424; border: 1px solid #555; border-radius: 8px; }
.replay-buttons { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.replay-buttons .btn { min-width: 38px; min-height: 38px; }
.replay-play { min-width: 112px; }
.replay-speed { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.replay-speed select { padding: 6px; color: #fff; background: #333; }
.replay-position { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.replay-position span { white-space: nowrap; }
.replay-position input { flex: 1; min-width: 0; }
.replay-status { margin: 8px 0 0; min-height: 24px; }
.replay-error { padding: 16px 0; }
.replay-frame { min-width: 0; }
.replay-players, .replay-board { position: relative; max-width: 100%; overflow-x: auto; margin-top: 16px; }
.replay-players :deep(.players-overview) { display: block; }
.replay-players :deep(.player-info) { flex-wrap: wrap; }
/* The board is the main element of the replay: scale it up when the viewport has room.
   Without zoom support the board keeps its natural size and the block still scrolls. */
.replay-board-inner { zoom: var(--replay-board-zoom, 1); }
@media (min-width: 1560px) {
  .replay-board-inner { --replay-board-zoom: 1.3; }
}
@media (min-width: 1800px) {
  .replay-board-inner { --replay-board-zoom: 1.5; }
}
.replay-colonies { display: flex; flex-wrap: wrap; gap: 12px; max-width: 100%; }
.replay-colonies h2 { width: 100%; }
.replay-log { margin-top: 20px; max-width: 100%; overflow-wrap: anywhere; }
.replay-log ul { padding: 0 12px; margin: 0; list-style: none; }
.replay-log-history { margin-top: 10px !important; }
.replay-current-log { padding: 8px 4px; background: #262629; border: 1px solid #555; border-radius: 6px; }
.replay-current-log h3 { margin: 0 12px 6px; font-size: 15px; }
.replay-card-overlay { position: fixed; inset: 0; z-index: 40; display: flex; justify-content: center; align-items: center; overflow: auto; padding: 16px; box-sizing: border-box; background: #000b; }
.replay-card-overlay :deep(.card-panel) { max-width: 100%; max-height: calc(100vh - 32px); overflow: auto; }
.replay-log :deep(.log-generations) { margin-bottom: 8px; }
.replay-log :deep(.log-player-filters) { margin-bottom: 10px; }
.replay-home button:focus-visible, .replay-home select:focus-visible, .replay-home input:focus-visible { outline: 3px solid #ffc567; outline-offset: 3px; }
@media (max-width: 600px) {
  .replay-home { padding: 8px; }
  .replay-controls { padding: 8px; }
  .replay-buttons { gap: 6px; }
  .replay-speed { margin-left: 0; width: 100%; }
  .replay-position { flex-direction: column; align-items: stretch; gap: 4px; }
}
@media (max-width: 480px) {
  .replay-colonies :deep(.colony-card) { zoom: 0.65; }
}
</style>
