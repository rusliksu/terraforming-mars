<template>
  <div id="games-overview" class="games-overview-container">
    <AdminNav active="games"/>
    <section class="games-overview-card">
      <p v-if="status === 'loading'" class="games-overview-note" v-i18n>Loading…</p>
      <template v-else-if="status === 'error'">
        <p class="games-overview-note"><span v-i18n>The game list could not be loaded.</span></p>
        <button type="button" class="btn btn-tone-quiet" @click="getGames" v-i18n>Try again</button>
      </template>
      <p v-else-if="entries.length === 0" class="games-overview-note" v-i18n>No games yet.</p>
      <div v-else class="games-overview-scroll">
        <table class="games-overview-table">
          <thead>
            <tr>
              <th v-i18n>Game</th>
              <th v-i18n>Players</th>
              <th v-i18n>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in entries" :key="entry.id">
              <td><a :href="'game?id=' + entry.id">{{ entry.id }}</a></td>
              <td>{{ entry.game?.players?.length ?? '…' }}</td>
              <td>{{ entry.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {SimpleGameModel} from '@/common/models/SimpleGameModel';
import {GameId} from '@/common/Types';
import AdminNav from '@/client/wrybit/pages/admin/AdminNav.vue';

type Entry = {id: GameId, game: SimpleGameModel | undefined, status: 'loading' | 'error' | 'done'};
type Response = {gameId: GameId, participants: Array<string>};

export default defineComponent({
  name: 'WrybitGamesOverview',
  components: {AdminNav},
  data(): {entries: Array<Entry>, status: 'loading' | 'error' | 'done'} {
    return {entries: [], status: 'loading'};
  },
  mounted() {
    void this.getGames();
  },
  computed: {
    serverId(): string {
      return new URLSearchParams(window.location.search).get('serverId') || '';
    },
  },
  methods: {
    async getGames() {
      this.status = 'loading';
      try {
        const response = await fetch('api/games?serverId=' + this.serverId);
        if (!response.ok) {
          this.status = 'error';
          return;
        }
        const result: Array<Response> = await response.json();
        if (!(result instanceof Array)) {
          this.status = 'error';
          return;
        }
        this.entries = result.map((entry) => ({id: entry.gameId, game: undefined, status: 'loading'}));
        this.status = 'done';
        await Promise.all(this.entries.map((entry) => this.getGame(entry)));
      } catch (error) {
        console.error(error);
        this.status = 'error';
      }
    },
    async getGame(entry: Entry) {
      try {
        const response = await fetch('api/game?id=' + entry.id);
        if (!response.ok) {
          entry.status = 'error';
          return;
        }
        entry.game = await response.json() as SimpleGameModel;
        entry.status = 'done';
      } catch (error) {
        console.error(error);
        entry.status = 'error';
      }
    },
  },
});
</script>
