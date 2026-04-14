<template>
  <tr>

  <!-- single item in GamesOverview -->
  <td><span :class="statusClass"></span></td>
  <td><a :href="'game?id='+id" class="game-id">{{id}}</a></td>
  <template v-if="game !== undefined">
    <td v-for="player in game.players" :key="player.color">
      <span class="player-name" :class="'player_bg_color_'+ player.color">
        <a calassc target="blank" :href="playerHref(player.id)">{{player.name}}</a>
      </span>
      <button
        v-if="isRunning && serverId !== ''"
        class="bot-takeover-button"
        :disabled="busyPlayerIds.includes(player.id)"
        @click.stop.prevent="toggleBot(player.id)">
        {{isBotRunning(player.id) ? 'Stop bot' : 'Run bot'}}
      </button>
    </td>
    <td><a target="blank" :href="'spectator?id=' + game.spectatorId" v-i18n class="player-name spectator">Spectator</a></td>
  </template>
  </tr>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {SimpleGameModel} from '@/common/models/SimpleGameModel';
import {Phase} from '@/common/Phase';

type Status = 'loading' | 'error' | 'done';

export default defineComponent({
  name: 'GameOverview',
  data() {
    return {
      botPlayersOverride: undefined as Array<string> | undefined,
      busyPlayerIds: [] as Array<string>,
    };
  },
  props: {
    status: {
      type: String as () => Status,
      required: true,
    },
    game: {
      type: Object as () => SimpleGameModel | undefined,
      required: true,
    },
    id: {
      type: String,
      required: true,
    },
    serverIdOverride: {
      type: String,
      required: false,
      default: '',
    },
  },
  computed: {
    activeBotPlayers(): Array<string> {
      return this.botPlayersOverride ?? this.game?.botPlayers ?? [];
    },
    serverId(): string {
      return this.serverIdOverride || new URLSearchParams(window.location.search).get('serverId') || '';
    },
    statusClass(): string {
      switch (this.status) {
      case 'loading':
        return 'status-loading';
      case 'error':
        return 'status-error';
      case 'done':
        if (this.isRunning) {
          return 'status-running';
        } else {
          return 'status-finished';
        }
      default:
        return '';
      }
    },
    isRunning(): boolean {
      return this.game?.phase !== Phase.END;
    },
  },
  methods: {
    isBotRunning(playerId: string): boolean {
      return this.activeBotPlayers.includes(playerId);
    },
    playerHref(playerId: string): string {
      const params = new URLSearchParams({id: playerId});
      if (this.serverId !== '') {
        params.set('serverId', this.serverId);
      }
      return 'player?' + params.toString();
    },
    async toggleBot(playerId: string) {
      if (this.serverId === '' || this.busyPlayerIds.includes(playerId)) {
        return;
      }
      const action = this.isBotRunning(playerId) ? 'stop' : 'start';
      this.busyPlayerIds = [...this.busyPlayerIds, playerId];
      try {
        const query = new URLSearchParams({
          action,
          gameId: this.id,
          playerId,
          serverId: this.serverId,
        });
        const response = await fetch('api/bot-takeover?' + query.toString(), {method: 'POST'});
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const payload = await response.json() as {botPlayers?: Array<string>};
        this.botPlayersOverride = Array.isArray(payload.botPlayers) ? payload.botPlayers : [];
      } catch (error) {
        alert(error instanceof Error ? error.message : String(error));
      } finally {
        this.busyPlayerIds = this.busyPlayerIds.filter((id) => id !== playerId);
      }
    },
  },
});
</script>

<style scoped>
.bot-takeover-button {
  margin-left: 6px;
  padding: 2px 6px;
  font-size: 11px;
}
</style>
