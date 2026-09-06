<template>
  <main class="replay-home">
    <header class="replay-heading">
      <a :href="'/spectator?id=' + encodeURIComponent(spectatorId)" v-i18n>Back to game</a>
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
      <div class="replay-players">
        <PlayersOverview :playerView="state.frame.view" :readOnly="true"/>
      </div>
      <div class="replay-board">
        <GameBoardView :game="state.frame.view.game" :players="state.frame.view.players" :tileView="tileView"
          @toggleTileView="tileView = nextTileView(tileView)"/>
      </div>
      <section v-if="state.frame.view.game.colonies.length > 0" class="replay-colonies">
        <h2 v-i18n>Colonies</h2>
        <Colony v-for="colony in state.frame.view.game.colonies" :key="colony.name" :colony="colony" :active="colony.isActive"/>
      </section>
      <section class="replay-log" :aria-label="$t('Saved public log')">
        <h2 v-i18n>Saved public log</h2>
        <ol>
          <LogMessageComponent v-for="(message, index) in state.frame.logs" :key="index"
            :message="message" :viewModel="state.frame.view"/>
        </ol>
        <p v-if="state.frame.logs.length === 0" v-i18n>No public messages in this save.</p>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import GameBoardView from '@/client/components/GameBoardView.vue';
import PlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import Colony from '@/client/components/colonies/Colony.vue';
import LogMessageComponent from '@/client/components/logpanel/LogMessageComponent.vue';
import {TileView, nextTileView} from '@/client/components/board/TileView';
import {useReplay} from './useReplay';

const spectatorId = new URLSearchParams(window.location.search).get('id') ?? '';
const {state, initialize, seek, play, pause, setSpeed} = useReplay(spectatorId);
const tileView = ref<TileView>('show');
const count = computed(() => state.index?.saveIds.length ?? 0);
const atEnd = computed(() => state.position >= count.value - 1);
onMounted(initialize);
</script>

<style scoped>
.replay-home { width: 100%; max-width: 1280px; min-width: 0; margin: 0 auto; padding: 16px; box-sizing: border-box; }
.replay-heading h1 { font-size: 24px; overflow-wrap: anywhere; }
.replay-heading p { color: #bbb; }
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
.replay-colonies { display: flex; flex-wrap: wrap; gap: 12px; }
.replay-colonies h2 { width: 100%; }
.replay-log { margin-top: 20px; overflow-wrap: anywhere; }
.replay-log ol { max-height: 360px; overflow-y: auto; padding: 0 12px; list-style: none; }
.replay-home button:focus-visible, .replay-home select:focus-visible, .replay-home input:focus-visible { outline: 3px solid #ffc567; outline-offset: 3px; }
@media (max-width: 600px) {
  .replay-home { padding: 8px; }
  .replay-controls { padding: 8px; }
  .replay-buttons { gap: 6px; }
  .replay-speed { margin-left: 0; width: 100%; }
  .replay-position { flex-direction: column; align-items: stretch; gap: 4px; }
}
</style>
