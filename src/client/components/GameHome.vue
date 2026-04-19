<template>
      <div id="game-home" class="game-home-container">
        <h1><span v-i18n>Terraforming Mars</span> [<span v-i18n>game id:</span> <span>{{getGameId()}}</span>]</h1>
        <h4><span v-i18n>Instructions: To start the game, separately copy and share the links with all players, and then click on your name.</span><br/><span v-i18n>Save this page in case you or one of your opponents loses a link.</span></h4>
        <ul>
          <li v-for="(player, index) in (game === undefined ? [] : game.players)" :key="player.color">
            <span class="turn-order" v-i18n>{{getTurnOrder(index)}}</span>
            <span :class="'color-square ' + getPlayerCubeColorClass(player.color)">{{playerSymbol(player.color)}}</span>
            <span class="player-name"><a :href="getHref(player.id)">{{player.name}}</a></span>
            <button
              v-if="isRunning"
              class="bot-toggle"
              :class="{'bot-toggle--active': isBotRunning(player.id)}"
              :aria-checked="isBotRunning(player.id) ? 'true' : 'false'"
              :aria-label="isBotRunning(player.id) ? 'Return control to player' : 'Let bot play for this player'"
              :title="isBotRunning(player.id) ? 'Return control to player' : 'Let bot play for this player'"
              role="switch"
              :disabled="busyPlayerIds.includes(player.id)"
              @click.stop.prevent="toggleBot(player.id)">
              <span class="bot-toggle__track">
                <span class="bot-toggle__thumb"></span>
              </span>
              <span class="bot-toggle__label">Bot takeover</span>
              <span v-if="isBotRunning(player.id)" class="bot-toggle__state">bot is playing</span>
            </button>
            <AppButton title="copy" size="tiny" @click="copyUrl(player.id)"/>
            <span v-if="isPlayerUrlCopied(player.id)" class="copied-notice"><span v-i18n>Copied!</span></span>
          </li>
          <li v-if="game !== undefined && game.spectatorId">
            <p/>
            <span class="turn-order"></span>
            <span class="color-square"></span>
            <span class="player-name"><a :href="getHref(game.spectatorId)" v-i18n>Spectator</a></span>
            <AppButton title="copy" size="tiny" @click="copyUrl(game.spectatorId)"/>
          </li>
        </ul>

        <div class="spacing-setup"></div>

        <purge-warning :expectedPurgeTimeMs="game.expectedPurgeTimeMs"></purge-warning>

        <div class="spacing-setup"></div>
        <div v-if="game !== undefined">
          <h1 v-i18n>Game settings</h1>
          <game-setup-detail :gameOptions="game.gameOptions" :playerNumber="game.players.length" :lastSoloGeneration="game.lastSoloGeneration"></game-setup-detail>
        </div>
      </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {SimpleGameModel} from '@/common/models/SimpleGameModel';
import AppButton from '@/client/components/common/AppButton.vue';
import PurgeWarning from '@/client/components/common/PurgeWarning.vue';
import {playerColorClass} from '@/common/utils/utils';
import GameSetupDetail from '@/client/components/GameSetupDetail.vue';
import {ParticipantId} from '@/common/Types';
import {Color} from '@/common/Color';
import {playerSymbol} from '@/client/utils/playerSymbol';

// taken from https://stackoverflow.com/a/46215202/83336
// The solution to copying to the clipboard in this case is
// 1. create a dummy input
// 2. add the copied text as a value
// 3. select the input
// 4. execute document.execCommand('copy') which does the clipboard thing
// 5. remove the dummy input
function copyToClipboard(text: string): void {
  const input = document.createElement('input');
  input.setAttribute('value', text);
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}
const DEFAULT_COPIED_PLAYER_ID = '-1';

export default defineComponent({
  name: 'game-home',
  props: {
    game: {
      type: Object as () => SimpleGameModel,
      required: true,
    },
  },
  components: {
    AppButton,
    'game-setup-detail': GameSetupDetail,
    PurgeWarning,
  },
  data() {
    return {
      botPlayersOverride: undefined as Array<string> | undefined,
      busyPlayerIds: [] as Array<string>,
      // Variable to keep the state for the current copied player id. Used to display message of which button and which player playable link is currently in the clipboard
      urlCopiedPlayerId: DEFAULT_COPIED_PLAYER_ID,
    };
  },
  computed: {
    activeBotPlayers(): Array<string> {
      return this.botPlayersOverride ?? this.game?.botPlayers ?? [];
    },
    isRunning(): boolean {
      return this.game.phase !== 'end';
    },
    serverId(): string {
      return new URLSearchParams(window.location.search).get('serverId') || '';
    },
  },
  mounted() {
    void this.refreshBotPlayers();
  },
  methods: {
    async refreshBotPlayers() {
      if (!this.isRunning) {
        return;
      }
      try {
        const query = new URLSearchParams({
          gameId: this.getGameId(),
        });
        if (this.serverId !== '') {
          query.set('serverId', this.serverId);
        }
        const response = await fetch('api/bot-takeover?' + query.toString());
        if (!response.ok) {
          return;
        }
        const payload = await response.json() as {botPlayers?: Array<string>};
        if (Array.isArray(payload.botPlayers)) {
          this.botPlayersOverride = payload.botPlayers;
        }
      } catch (_error) {
        // Degrade gracefully when the optional bot status probe is unavailable.
      }
    },
    getGameId(): string {
      return this.game !== undefined ? this.game.id.toString() : 'n/a';
    },
    getTurnOrder(index: number): string {
      if (index === 0) {
        return '1st';
      } else if (index === 1) {
        return '2nd';
      } else if (index === 2) {
        return '3rd';
      } else if (index > 2) {
        return `${index + 1}th`;
      } else {
        return 'n/a';
      }
    },
    setCopiedIdToDefault() {
      this.urlCopiedPlayerId = DEFAULT_COPIED_PLAYER_ID;
    },
    isBotRunning(playerId: string): boolean {
      return this.activeBotPlayers.includes(playerId);
    },
    getPlayerCubeColorClass(color: Color): string {
      return playerColorClass(color, 'bg');
    },
    getHref(playerId: ParticipantId): string {
      if (playerId === this.game.spectatorId) {
        return `spectator?id=${playerId}`;
      }
      return `player?id=${playerId}`;
    },
    copyUrl(playerId: ParticipantId | undefined): void {
      if (playerId === undefined) return;
      // Get current location path without game?id=xxxxxxx
      const path = window.location.href.replace(/game\?id=.*/, '');
      copyToClipboard(path + this.getHref(playerId));
      this.urlCopiedPlayerId = playerId;
    },
    isPlayerUrlCopied(playerId: string): boolean {
      return playerId === this.urlCopiedPlayerId;
    },
    async toggleBot(playerId: string) {
      if (this.busyPlayerIds.includes(playerId)) {
        return;
      }
      const action = this.isBotRunning(playerId) ? 'stop' : 'start';
      this.busyPlayerIds = [...this.busyPlayerIds, playerId];
      try {
        const query = new URLSearchParams({
          action,
          gameId: this.getGameId(),
          playerId,
        });
        if (this.serverId !== '') {
          query.set('serverId', this.serverId);
        }
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
    playerSymbol(color: Color) {
      return playerSymbol(color);
    },
  },
});

</script>

<style scoped>
.bot-toggle {
  align-items: center;
  background: transparent;
  border: 0;
  color: #333;
  cursor: pointer;
  display: inline-flex;
  gap: 6px;
  margin: 0 6px;
  padding: 0;
  vertical-align: middle;
}

.bot-toggle[disabled] {
  cursor: wait;
  opacity: 0.6;
}

.bot-toggle__track {
  align-items: center;
  background: #bbb;
  border-radius: 999px;
  display: inline-flex;
  height: 18px;
  padding: 2px;
  transition: background-color 0.15s ease;
  width: 34px;
}

.bot-toggle__thumb {
  background: #fff;
  border-radius: 50%;
  display: block;
  height: 14px;
  transform: translateX(0);
  transition: transform 0.15s ease;
  width: 14px;
}

.bot-toggle--active .bot-toggle__track {
  background: #2a9d5b;
}

.bot-toggle--active .bot-toggle__thumb {
  transform: translateX(16px);
}

.bot-toggle__label {
  font-size: 12px;
  font-weight: 600;
}

.bot-toggle__state {
  color: #2a9d5b;
  font-size: 11px;
  font-weight: 600;
}
</style>
