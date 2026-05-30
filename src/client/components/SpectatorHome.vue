<template>
  <div id="spectator-home" :class="(game.turmoil ? 'with-turmoil': '')">

    <div v-if="game.phase === 'end'">
      <div class="player_home_block">
        <DynamicTitle title="This game is over!" :color="spectator.color"/>
        <a :href="'the-end?id='+ spectator.id" v-i18n>Go to game results</a>
      </div>
    </div>

    <sidebar v-trim-whitespace
      :acting_player="false"
      :player_color="spectator.color"
      :generation="game.generation"
      :coloniesCount="game.colonies.length"
      :temperature = "game.temperature"
      :oxygen = "game.oxygenLevel"
      :oceans = "game.oceans"
      :venus = "game.venusScaleLevel"
      :turmoil = "game.turmoil"
      :moonData="game.moon"
      :gameOptions = "game.gameOptions"
      :playerNumber = "spectator.players.length"
      :isTerraformed="game.isTerraformed"
      :lastSoloGeneration = "game.lastSoloGeneration"
      :deckSize = "game.deckSize"
      :discardPileSize = "game.discardPileSize">
    </sidebar>

    <div class="player_home_block nofloat">
        <log-panel v-if="spectator.id !== undefined" :viewModel="spectator" :color="spectator.color" :step="game.step"></log-panel>
    </div>

    <players-overview class="player_home_block player_home_block--players nofloat" :playerView="spectator" v-trim-whitespace id="shortkey-playersoverview"/>

    <div v-if="playersWithSpectatorCards.length > 0" class="player_home_block nofloat spectator-hands">
      <dynamic-title title="Player hands" :color="spectator.color"/>
      <div v-for="player in playersWithSpectatorCards" :key="player.color" class="spectator-hand">
        <h3>
          <span :class="'log-player player_bg_color_' + player.color">{{ player.name }}</span>
        </h3>
        <div class="spectator-hand-toggles">
          <template v-for="group in spectatorCardGroups(player)" :key="player.color + group.label + '-button'">
            <button
              v-if="group.cards.length > 0"
              type="button"
              :class="['spectator-hand-toggle', {'spectator-hand-toggle--open': isSpectatorCardGroupVisible(player, group)}]"
              @click.prevent="toggleSpectatorCardGroup(player, group)">
              {{ group.label }} ({{ group.cards.length }})
            </button>
          </template>
        </div>
        <div v-for="group in spectatorCardGroups(player)" :key="player.color + group.label" class="spectator-hand-group">
          <div v-if="group.cards.length > 0 && isSpectatorCardGroupVisible(player, group)">
            <div class="spectator-hand-label">{{ group.label }} ({{ group.cards.length }})</div>
            <div class="sortable-cards">
              <div v-for="card in group.cards" :key="card.name" class="cardbox">
                <Card :card="card"/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <GameBoardView
      :game="game"
      :tileView="tileView"
      :players="spectator.players"
      @toggleTileView="cycleTileView()"
    />

    <div v-if="game.colonies.length > 0" class="player_home_block" ref="colonies" id="shortkey-colonies">
      <a name="colonies" class="player_home_anchor"></a>
      <dynamic-title title="Colonies" :color="spectator.color"/>
      <div class="colonies-fleets-cont">
        <div class="colonies-player-fleets" v-for="player in spectator.players" v-bind:key="player.color">
            <div :class="'colonies-fleet colonies-fleet-'+ player.color" v-for="idx in range(Math.max(0, player.fleetSize - player.tradesThisGeneration))" v-bind:key="idx"></div>
        </div>
      </div>
      <div class="player_home_colony_cont">
        <div class="player_home_colony" v-for="colony in spectator.game.colonies" :key="colony.name">
            <colony :colony="colony" :active="colony.isActive"></colony>
        </div>
      </div>
    </div>
    <waiting-for v-show="false" v-if="game.phase !== 'end'" :playerView="spectator" :waitingfor="undefined"></waiting-for>
    <div v-if="game.spectatorId">
      <a :href="'/spectator?id=' +game.spectatorId" target="_blank" rel="noopener noreferrer" v-i18n>Spectator link</a>
    </div>
    <purge-warning :expectedPurgeTimeMs="game.expectedPurgeTimeMs"></purge-warning>
    <KeyboardShortcuts v-show="keyboardShortcutOpened" @close="keyboardShortcutOpened = false"></KeyboardShortcuts>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

import {GameModel} from '@/common/models/GameModel';
import {CardModel} from '@/common/models/CardModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {vueRoot} from '@/client/components/vueRoot';
import {SpectatorModel} from '@/common/models/SpectatorModel';
import Card from '@/client/components/card/Card.vue';
import Colony from '@/client/components/colonies/Colony.vue';
import DynamicTitle from '@/client/components/common/DynamicTitle.vue';
import GameBoardView from '@/client/components/GameBoardView.vue';
import LogPanel from '@/client/components/logpanel/LogPanel.vue';
import Sidebar from '@/client/components/Sidebar.vue';
import WaitingFor from '@/client/components/WaitingFor.vue';
import PlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import PlanetaryTracks from '@/client/components/pathfinders/PlanetaryTracks.vue';
import PurgeWarning from '@/client/components/common/PurgeWarning.vue';
import KeyboardShortcuts from '@/client/components/KeyboardShortcuts.vue';
import {range} from '@/common/utils/utils';
import {HomeMixin} from '@/client/mixins/HomeMixin';

type SpectatorHandGroup = {
  label: string;
  cards: ReadonlyArray<CardModel>;
};

type SpectatorHomeData = {
  revealedSpectatorCardGroups: Record<string, boolean>;
};

export default defineComponent({
  name: 'SpectatorHome',
  mixins: [HomeMixin],
  data(): SpectatorHomeData {
    return {
      revealedSpectatorCardGroups: {},
    };
  },
  props: {
    spectator: {
      type: Object as () => SpectatorModel,
      required: true,
    },
  },
  computed: {
    game(): GameModel {
      return this.spectator.game;
    },
    playersWithSpectatorCards(): Array<PublicPlayerModel> {
      return this.spectator.players.filter((player) => this.spectatorCardGroups(player).some((group) => group.cards.length > 0));
    },
  },
  components: {
    Card,
    Colony,
    DynamicTitle,
    GameBoardView,
    KeyboardShortcuts,
    LogPanel,
    PlanetaryTracks,
    PlayersOverview,
    PurgeWarning,
    Sidebar,
    WaitingFor,
  },
  methods: {
    forceRerender() {
      // TODO(kberg): this is very inefficient. It pulls down the entire state, ignoring the value of 'waitingFor' which only fetches a short state.
      vueRoot(this).updateSpectator();
    },
    range(n: number): Array<number> {
      return range(n);
    },
    spectatorCardGroups(player: PublicPlayerModel): Array<SpectatorHandGroup> {
      const cards = player.spectatorCards;
      if (cards === undefined) {
        return [];
      }
      return [
        {label: 'Cards in hand', cards: cards.cardsInHand},
        {label: 'Prelude cards', cards: cards.preludeCardsInHand},
        {label: 'CEO cards', cards: cards.ceoCardsInHand},
      ];
    },
    spectatorCardGroupKey(player: PublicPlayerModel, group: SpectatorHandGroup): string {
      return `${player.color}:${group.label}`;
    },
    isSpectatorCardGroupVisible(player: PublicPlayerModel, group: SpectatorHandGroup): boolean {
      return this.revealedSpectatorCardGroups[this.spectatorCardGroupKey(player, group)] === true;
    },
    toggleSpectatorCardGroup(player: PublicPlayerModel, group: SpectatorHandGroup): void {
      const key = this.spectatorCardGroupKey(player, group);
      this.revealedSpectatorCardGroups = {
        ...this.revealedSpectatorCardGroups,
        [key]: !this.revealedSpectatorCardGroups[key],
      };
    },
  },
});
</script>

<style scoped>
.spectator-hand {
  margin-top: 16px;
}

.spectator-hand h3 {
  margin: 0 0 8px;
}

.spectator-hand-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.spectator-hand-toggle {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 4px 8px;
}

.spectator-hand-toggle--open {
  background: rgba(255, 255, 255, 0.28);
  border-color: rgba(255, 255, 255, 0.7);
}

.spectator-hand-label {
  margin: 12px 0 6px;
  font-weight: 600;
}
</style>
