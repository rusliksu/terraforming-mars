<template>
  <div id="stats" class="wrybit-stats">
    <header class="wrybit-stats-head">
      <PageToolbar/>
      <div>
        <h1 v-i18n>Statistics</h1>
        <p class="wrybit-stats-subtitle" v-i18n>Public results from finished games.</p>
      </div>
      <button type="button" class="btn btn-tone-quiet" :disabled="status === 'loading'" @click="load" v-i18n>Refresh</button>
    </header>

    <nav class="wrybit-stats-tabs" aria-label="Statistics sections">
      <button
        v-for="tab in TABS"
        :key="tab"
        type="button"
        class="wrybit-stats-tab"
        :class="{'wrybit-stats-tab--active': activeTab === tab}"
        :aria-current="activeTab === tab ? 'page' : undefined"
        @click="selectTab(tab)"
        v-i18n>{{ tabLabel(tab) }}</button>
    </nav>

    <section class="wrybit-stats-filters">
      <label>
        <span v-i18n>Search player or corporation</span>
        <input v-model="query" type="search" :placeholder="$t('Search')">
      </label>
      <label>
        <span v-i18n>Map</span>
        <select v-model="mapFilter">
          <option value="" v-i18n>All maps</option>
          <option v-for="map in maps" :key="map" :value="map">{{ map }}</option>
        </select>
      </label>
      <p class="wrybit-stats-count">
        <strong>{{ filteredGames.length }}</strong> / {{ games.length }}
        <span v-i18n>games</span>
      </p>
    </section>

    <p v-if="status === 'loading'" class="wrybit-stats-note" v-i18n>Loading statistics…</p>
    <div v-else-if="status === 'error'" class="wrybit-stats-note">
      <p v-i18n>Could not load the statistics.</p>
      <button type="button" class="btn btn-primary" @click="load" v-i18n>Try again</button>
    </div>
    <p v-else-if="games.length === 0" class="wrybit-stats-note" v-i18n>No finished games yet.</p>
    <template v-else>
      <section v-if="activeTab === 'overview'" class="wrybit-stats-grid">
        <article class="wrybit-stats-card wrybit-stats-card--wide">
          <h2 v-i18n>Overview</h2>
          <div class="wrybit-stats-kpis">
            <div><strong>{{ filteredGames.length }}</strong><span v-i18n>Games</span></div>
            <div><strong>{{ playerRows.length }}</strong><span v-i18n>Players</span></div>
            <div><strong>{{ averageGenerations }}</strong><span v-i18n>Avg. generations</span></div>
            <div><strong>{{ averageDuration }}</strong><span v-i18n>Avg. minutes</span></div>
          </div>
        </article>
        <article class="wrybit-stats-card">
          <h2 v-i18n>Top players</h2>
          <p v-if="playerRows.length === 0" class="wrybit-stats-muted" v-i18n>No players match the filter.</p>
          <table v-else class="wrybit-stats-table">
            <thead><tr><th v-i18n>Player</th><th v-i18n>Wins</th><th v-i18n>Games</th></tr></thead>
            <tbody><tr v-for="row in playerRows.slice(0, 8)" :key="row.name"><td>{{ row.name }}</td><td>{{ row.wins }}</td><td>{{ row.games }}</td></tr></tbody>
          </table>
        </article>
        <article class="wrybit-stats-card">
          <h2 v-i18n>Top corporations</h2>
          <p v-if="corporationRows.length === 0" class="wrybit-stats-muted" v-i18n>No corporations match the filter.</p>
          <table v-else class="wrybit-stats-table">
            <thead><tr><th v-i18n>Corporation</th><th v-i18n>Wins</th><th v-i18n>Games</th></tr></thead>
            <tbody><tr v-for="row in corporationRows.slice(0, 8)" :key="row.name"><td>{{ row.name }}</td><td>{{ row.wins }}</td><td>{{ row.games }}</td></tr></tbody>
          </table>
        </article>
        <article class="wrybit-stats-card wrybit-stats-card--wide">
          <h2 v-i18n>Recent games</h2>
          <div class="wrybit-stats-scroll">
            <table class="wrybit-stats-table">
              <thead><tr><th v-i18n>Date</th><th v-i18n>Map</th><th v-i18n>Players</th><th v-i18n>Winner</th><th v-i18n>VP</th></tr></thead>
              <tbody>
                <tr v-for="game in recentGames" :key="game.id">
                  <td>{{ formatDate(game.date) }}</td><td>{{ game.map ?? '—' }}</td><td>{{ game.playerCount }}</td>
                  <td>{{ winner(game).displayName }}</td><td>{{ winner(game).victoryPoints }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section v-else-if="activeTab === 'games'" class="wrybit-stats-card">
        <h2 v-i18n>Games</h2>
        <div class="wrybit-stats-scroll">
          <table class="wrybit-stats-table">
            <thead><tr><th v-i18n>Date</th><th v-i18n>Map</th><th v-i18n>Players</th><th v-i18n>Generations</th><th v-i18n>Winner</th><th v-i18n>VP</th></tr></thead>
            <tbody>
              <tr v-for="game in filteredGames" :key="game.id">
                <td>{{ formatDate(game.date) }}</td><td>{{ game.map ?? '—' }}</td><td>{{ game.playerCount }}</td><td>{{ game.generations }}</td>
                <td>{{ winner(game).displayName }}</td><td>{{ winner(game).victoryPoints }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="activeTab === 'players'" class="wrybit-stats-card">
        <h2 v-i18n>Players</h2>
        <div class="wrybit-stats-scroll">
          <table class="wrybit-stats-table">
            <thead><tr><th v-i18n>Player</th><th v-i18n>Games</th><th v-i18n>Wins</th><th v-i18n>Win rate</th><th v-i18n>Avg. place</th><th v-i18n>Avg. VP</th></tr></thead>
            <tbody>
              <tr v-for="row in playerRows" :key="row.name"><td>{{ row.name }}</td><td>{{ row.games }}</td><td>{{ row.wins }}</td><td>{{ percent(row.wins, row.games) }}</td><td>{{ row.averagePlace }}</td><td>{{ row.averageVictoryPoints }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="activeTab === 'corporations'" class="wrybit-stats-card">
        <h2 v-i18n>Corporations</h2>
        <div class="wrybit-stats-scroll">
          <table class="wrybit-stats-table">
            <thead><tr><th v-i18n>Corporation</th><th v-i18n>Games</th><th v-i18n>Wins</th><th v-i18n>Win rate</th><th v-i18n>Avg. place</th><th v-i18n>Avg. VP</th></tr></thead>
            <tbody><tr v-for="row in corporationRows" :key="row.name"><td>{{ row.name }}</td><td>{{ row.games }}</td><td>{{ row.wins }}</td><td>{{ row.winRate }}</td><td>{{ row.averagePlace }}</td><td>{{ row.averageVictoryPoints }}</td></tr></tbody>
          </table>
        </div>
      </section>

      <section v-else-if="activeTab === 'boards'" class="wrybit-stats-card">
        <h2 v-i18n>Boards</h2>
        <div class="wrybit-stats-scroll">
          <table class="wrybit-stats-table">
            <thead><tr><th v-i18n>Board</th><th v-i18n>Games</th><th v-i18n>Avg. generations</th><th v-i18n>Avg. players</th></tr></thead>
            <tbody><tr v-for="row in boardRows" :key="row.name"><td>{{ row.name }}</td><td>{{ row.games }}</td><td>{{ row.averageGenerations }}</td><td>{{ row.averagePlayers }}</td></tr></tbody>
          </table>
        </div>
      </section>

      <section v-else class="wrybit-stats-grid">
        <article class="wrybit-stats-card"><h2 v-i18n>Highest VP</h2><p v-if="highestVp === undefined" class="wrybit-stats-muted" v-i18n>No result.</p><p v-else class="wrybit-stats-record"><strong>{{ highestVp.victoryPoints }} VP</strong> — {{ highestVp.displayName }}</p></article>
        <article class="wrybit-stats-card"><h2 v-i18n>Fastest game</h2><p v-if="fastestGame === undefined" class="wrybit-stats-muted" v-i18n>No duration data.</p><p v-else class="wrybit-stats-record"><strong>{{ fastestGame.durationMinutes }} min</strong> — {{ fastestGame.map ?? '—' }}</p></article>
        <article class="wrybit-stats-card"><h2 v-i18n>Largest Elo gain</h2><p v-if="largestEloGain === undefined" class="wrybit-stats-muted" v-i18n>No Elo data.</p><p v-else class="wrybit-stats-record"><strong>+{{ largestEloGain.eloDelta }}</strong> — {{ largestEloGain.displayName }}</p></article>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {paths} from '@/common/app/paths';
import {WrybitUiStatsGame, WrybitUiStatsResult, WrybitUiStatsSnapshot} from '@/common/models/WrybitUiStats';
import PageToolbar from '@/client/wrybit/visuals/PageToolbar.vue';

type Tab = 'overview' | 'games' | 'players' | 'corporations' | 'boards' | 'records';
type Status = 'loading' | 'error' | 'done';
type PlayerRow = {name: string, games: number, wins: number, places: Array<number>, victoryPoints: Array<number>};
type CorporationRow = {name: string, games: number, wins: number, places: Array<number>, victoryPoints: Array<number>, winRate?: string, averagePlace?: string, averageVictoryPoints?: string};
type BoardRow = {name: string, games: number, averageGenerations: string, averagePlayers: string};

const TABS: ReadonlyArray<Tab> = ['overview', 'games', 'players', 'corporations', 'boards', 'records'];
const TAB_LABELS: Record<Tab, string> = {overview: 'Overview', games: 'Games', players: 'Players', corporations: 'Corporations', boards: 'Boards', records: 'Records'};
const activeTab = ref<Tab>('overview');
const status = ref<Status>('loading');
const games = ref<ReadonlyArray<WrybitUiStatsGame>>([]);
const query = ref('');
const mapFilter = ref('');

const maps = computed(() => [...new Set(games.value.map((game) => game.map).filter((map): map is string => map !== undefined))].sort());
const filteredGames = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase();
  return games.value.filter((game) => {
    if (mapFilter.value !== '' && game.map !== mapFilter.value) {
      return false;
    }
    if (needle === '') {
      return true;
    }
    return game.results.some((result) => result.displayName.toLocaleLowerCase().includes(needle) ||
      (result.corporation ?? '').toLocaleLowerCase().includes(needle));
  });
});
const playerRows = computed<ReadonlyArray<PlayerRow & {winRate: string, averagePlace: string, averageVictoryPoints: string}>>(() => {
  const byPlayer = new Map<string, PlayerRow>();
  for (const game of filteredGames.value) {
    for (const result of game.results) {
      const row = byPlayer.get(result.displayName) ?? {name: result.displayName, games: 0, wins: 0, places: [], victoryPoints: []};
      row.games++;
      row.wins += result.place === 1 ? 1 : 0;
      row.places.push(result.place);
      row.victoryPoints.push(result.victoryPoints);
      byPlayer.set(row.name, row);
    }
  }
  return [...byPlayer.values()].map((row) => ({
    ...row,
    winRate: percent(row.wins, row.games),
    averagePlace: average(row.places),
    averageVictoryPoints: average(row.victoryPoints),
  })).sort((a, b) => b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name));
});
const corporationRows = computed<ReadonlyArray<CorporationRow>>(() => {
  const byCorporation = new Map<string, CorporationRow>();
  for (const game of filteredGames.value) {
    for (const result of game.results) {
      if (result.corporation === undefined) {
        continue;
      }
      const row = byCorporation.get(result.corporation) ?? {name: result.corporation, games: 0, wins: 0, places: [], victoryPoints: []};
      row.games++;
      row.wins += result.place === 1 ? 1 : 0;
      row.places.push(result.place);
      row.victoryPoints.push(result.victoryPoints);
      byCorporation.set(row.name, row);
    }
  }
  return [...byCorporation.values()]
    .map((row) => ({...row, averagePlace: average(row.places), averageVictoryPoints: average(row.victoryPoints)}))
    .sort((a, b) => b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name));
});
const boardRows = computed<ReadonlyArray<BoardRow>>(() => {
  const byBoard = new Map<string, {games: number, generations: Array<number>, players: Array<number>}>();
  for (const game of filteredGames.value) {
    const name = game.map ?? 'Unknown';
    const row = byBoard.get(name) ?? {games: 0, generations: [], players: []};
    row.games++;
    row.generations.push(game.generations);
    row.players.push(game.playerCount);
    byBoard.set(name, row);
  }
  return [...byBoard.entries()].map(([name, row]) => ({
    name,
    games: row.games,
    averageGenerations: average(row.generations),
    averagePlayers: average(row.players),
  })).sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
});
const averageGenerations = computed(() => average(filteredGames.value.map((game) => game.generations)));
const averageDuration = computed(() => average(filteredGames.value.flatMap((game) => game.durationMinutes === undefined ? [] : [game.durationMinutes])));
const recentGames = computed(() => [...filteredGames.value].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 10));
const allResults = computed(() => filteredGames.value.flatMap((game) => game.results));
const highestVp = computed(() => allResults.value.reduce<WrybitUiStatsResult | undefined>((best, result) => best === undefined || result.victoryPoints > best.victoryPoints ? result : best, undefined));
const largestEloGain = computed(() => allResults.value.reduce<WrybitUiStatsResult | undefined>((best, result) => (result.eloDelta ?? 0) > (best?.eloDelta ?? 0) ? result : best, undefined));
const fastestGame = computed(() => filteredGames.value.reduce<WrybitUiStatsGame | undefined>((best, game) => game.durationMinutes !== undefined && (best?.durationMinutes === undefined || game.durationMinutes < best.durationMinutes) ? game : best, undefined));

function average(values: ReadonlyArray<number>): string {
  if (values.length === 0) {
    return '—';
  }
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}
function percent(part: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((part * 100) / total)}%`;
}
function winner(game: WrybitUiStatsGame): WrybitUiStatsResult {
  return game.results[0];
}
function formatDate(date: string | undefined): string {
  return date === undefined ? '—' : date.slice(0, 10);
}
function tabLabel(tab: Tab): string {
  return TAB_LABELS[tab];
}
function selectTab(tab: Tab) {
  activeTab.value = tab;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history.replaceState(null, '', url);
}
function readTab() {
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'overview' || tab === 'games' || tab === 'players' || tab === 'records') {
    activeTab.value = tab;
  }
}
async function load() {
  status.value = 'loading';
  try {
    const response = await fetch(paths.API_WRYBIT_STATS, {headers: {Accept: 'application/json'}});
    if (!response.ok) {
      status.value = 'error';
      return;
    }
    const snapshot = await response.json() as WrybitUiStatsSnapshot;
    if (snapshot.projectionVersion !== 1 || !Array.isArray(snapshot.games)) {
      status.value = 'error';
      return;
    }
    games.value = snapshot.games;
    status.value = 'done';
  } catch {
    status.value = 'error';
  }
}
onMounted(() => {
  readTab();
  void load();
});
</script>
