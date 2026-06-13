<template>
        <div class="players-overview" v-if="hasPlayers()">
            <OverviewSettings />
            <div class="other_player" v-if="thisPlayer === undefined || players.length > 1">
                <div v-for="(otherPlayer, index) in getPlayersInOrder()" :key="otherPlayer.color">
                    <OtherPlayer v-if="thisPlayer === undefined || otherPlayer.color !== thisPlayer.color" :player="otherPlayer" :playerIndex="index"/>
                    <SpectatorHand v-if="thisPlayer === undefined && spectatorHandCardCount(otherPlayer) > 0" :player="otherPlayer" :playerIndex="index"/>
                </div>
            </div>
            <PlayerInfo v-for="(p, index) in getPlayersInOrder()"
              :player="p"
              :key="p.color"
              :playerView="playerView"
              :firstForGen="getIsFirstForGen(p)"
              :actionLabel="getActionLabel(p)"
              :eloDelta="getEloDelta(p)"
              :playerIndex="index"/>
            <div v-if="playerView.players.length > 1 && thisPlayer !== undefined" class="player-divider" ></div>
            <PlayerInfo
              v-if="thisPlayer !== undefined"
              :player="thisPlayer"
              :key="thisPlayer.color"
              :playerView="playerView"
              :firstForGen="getIsFirstForGen(thisPlayer)"
              :actionLabel="getActionLabel(thisPlayer)"
              :eloDelta="getEloDelta(thisPlayer)"
              :playerIndex="-1"/>
        </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import PlayerInfo from '@/client/components/overview/PlayerInfo.vue';
import OverviewSettings from '@/client/components/overview/OverviewSettings.vue';
import SpectatorHand from '@/client/components/overview/SpectatorHand.vue';
import OtherPlayer from '@/client/components/OtherPlayer.vue';
import {ViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {ActionLabel} from '@/client/components/overview/ActionLabel';
import {Phase} from '@/common/Phase';
import {Color} from '@/common/Color';
import {buildEloResultsForPlayers, EloResultRow, ensureEloLoaded, findMatchingEloGame, sharedEloState} from '@/client/utils/elo';

const SHOW_NEXT_LABEL_MIN = 2;

export const playerIndex = (
  color: Color,
  players: Array<PublicPlayerModel>,
): number => {
  for (let idx = 0; idx < players.length; idx++) {
    if (players[idx].color === color) {
      return idx;
    }
  }
  return -1;
};

export default defineComponent({
  name: 'PlayersOverview',
  props: {
    playerView: {
      type: Object as () => ViewModel,
      required: true,
    },
  },
  computed: {
    players(): Array<PublicPlayerModel> {
      return this.playerView.players;
    },
    thisPlayer(): PublicPlayerModel | undefined {
      return this.playerView.thisPlayer;
    },
  },
  components: {
    PlayerInfo,
    OverviewSettings,
    OtherPlayer,
    SpectatorHand,
  },
  data() {
    return {
      eloResults: [] as Array<EloResultRow>,
    };
  },
  mounted() {
    void this.fetchEloResults();
  },
  watch: {
    'playerView.game.phase'() {
      void this.fetchEloResults();
    },
    'playerView.game.gameAge'() {
      if (this.playerView.game.phase === Phase.END) {
        void this.fetchEloResults();
      }
    },
  },
  methods: {
    hasPlayers(): boolean {
      return this.players.length > 0;
    },
    getIsFirstForGen(player: PublicPlayerModel): boolean {
      return playerIndex(player.color, this.players) === 0;
    },
    spectatorHandCardCount(player: PublicPlayerModel): number {
      const cards = player.spectatorCards;
      if (cards === undefined) {
        return 0;
      }
      return cards.cardsInHand.length + cards.preludeCardsInHand.length + cards.ceoCardsInHand.length;
    },
    async fetchEloResults(): Promise<void> {
      if (this.playerView.game.phase !== Phase.END) {
        this.eloResults = [];
        return;
      }

      await ensureEloLoaded(true);
      if (!sharedEloState.loaded) {
        return;
      }

      const matchedGame = findMatchingEloGame(sharedEloState.games, this.players);
      if (!matchedGame) {
        return;
      }
      this.eloResults = buildEloResultsForPlayers(this.players, sharedEloState.players, matchedGame);
    },
    getEloDelta(player: PublicPlayerModel): number | undefined {
      const result = this.eloResults.find((entry) => entry.color === player.color || entry.name === player.name);
      return result?.delta;
    },
    getPlayersInOrder(): Array<PublicPlayerModel> {
      const players = this.players;
      if (this.thisPlayer === undefined) {
        return players;
      }

      let result = [];
      let currentPlayerOffset = 0;
      const currentPlayerIndex = playerIndex(
        this.thisPlayer.color,
        this.players,
      );

      // shift the array by putting the player on focus at the tail
      currentPlayerOffset = currentPlayerIndex + 1;
      result = players
        .slice(currentPlayerOffset)
        .concat(players.slice(0, currentPlayerOffset));
      // return all but the focused user
      return result.slice(0, -1);
    },
    getActionLabel(player: PublicPlayerModel): ActionLabel {
      if (this.playerView.game.phase === Phase.DRAFTING) {
        if (player.needsToDraft) {
          return 'drafting';
        } else {
          return 'none';
        }
      } else if (this.playerView.game.phase === Phase.RESEARCH) {
        if (player.needsToResearch) {
          return 'researching';
        } else {
          return 'none';
        }
      }
      if (this.playerView.game.passedPlayers.includes(player.color)) {
        return 'passed';
      }
      if (player.isActive) {
        return 'active';
      }
      const notPassedPlayers = this.players.filter(
        (p: PublicPlayerModel) => !this.playerView.game.passedPlayers.includes(p.color),
      );

      const currentPlayerIndex = playerIndex(
        player.color,
        notPassedPlayers,
      );

      if (currentPlayerIndex === -1) {
        return 'none';
      }

      const prevPlayerIndex =
                currentPlayerIndex === 0 ?
                  notPassedPlayers.length - 1 :
                  currentPlayerIndex - 1;
      const isNext = notPassedPlayers[prevPlayerIndex].isActive;

      if (isNext && this.players.length > SHOW_NEXT_LABEL_MIN) {
        return 'next';
      }

      return 'none';
    },
  },
});
</script>
