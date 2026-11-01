<template>
  <MobileSpectatorHome v-if="mobileLayout" :spectator="spectator" />
  <div v-else id="spectator-home" :class="{'with-turmoil': game.turmoil, 'player-home--fixed': usesFixedLayout}">
    <!-- Built like the Wrybit player view, just without own hand and input. -->
    <Sidebar
      :actingPlayer="false"
      :generation="game.generation"
      :playerColor="spectator.color"
      :coloniesCount="game.colonies.length"
      :temperature="game.temperature"
      :oxygen="game.oxygenLevel"
      :oceans="game.oceans"
      :venus="game.venusScaleLevel"
      :turmoil="game.turmoil"
      :moonData="game.moon"
      :gameOptions="game.gameOptions"
      :playerNumber="spectator.players.length"
      :lastSoloGeneration="game.lastSoloGeneration"
      :deckSize="game.deckSize"
      :discardPileSize="game.discardPileSize"
      :otherDeckSizes="game.otherDeckSizes"
      :spectatorId="game.spectatorId"
      :expectedPurgeTimeMs="game.expectedPurgeTimeMs" />

    <HomeColumns>
      <template #board>
        <div class="player_home_block player-home-columns__mars">
          <GameBoardView ref="gameBoardView" :game="game" :tileView="tileView" :players="spectator.players"
            @toggleTileView="cycleTileView()" />
          <div v-if="game.phase === 'end'" class="player_home_block">
            <a :href="'the-end?id=' + spectator.id" v-i18n>Go to game results</a>
          </div>
        </div>
      </template>

      <template #main>
        <a class="hotkey-target"></a>
        <PlayersOverview class="player_home_block player_home_block--players nofloat" :playerView="spectator"
          id="shortkey-playersoverview" />
        <RowResizeHandle kind="players" />
        <a class="hotkey-target"></a>
        <div class="player_home_block nofloat player-home-columns__log player_home_block--spectator-log">
          <LogPanel :viewModel="spectator" :milestonesAwards="true" @space-clicked="onSpaceClicked" />
        </div>
      </template>
    </HomeColumns>

    <WaitingFor v-show="false" v-if="game.phase !== 'end'" :player-view="spectator" :waitingfor="undefined" />
    <KeyboardShortcuts v-show="keyboardShortcutOpened" @close="keyboardShortcutOpened = false" />
  </div>
</template>

<script lang="ts">
import {computed, defineComponent} from 'vue';
import {GameModel} from '@/common/models/GameModel';
import {SpectatorModel} from '@/common/models/SpectatorModel';
import {HomeMixin} from '@/client/mixins/HomeMixin';
import Sidebar from '@/client/components/Sidebar.vue';
import WaitingFor from '@/client/components/WaitingFor.vue';
import HomeColumns from '@/client/wrybit/visuals/HomeColumns.vue';
import RowResizeHandle from '@/client/wrybit/visuals/RowResizeHandle.vue';
import GameBoardView from '@/client/wrybit/visuals/GameBoardView.vue';
import LogPanel from '@/client/wrybit/visuals/logpanel/LogPanel.vue';
import PlayersOverview from '@/client/wrybit/visuals/overview/PlayersOverview.vue';
import KeyboardShortcuts from '@/client/wrybit/visuals/KeyboardShortcuts.vue';
import MobileSpectatorHome from './MobileSpectatorHome.vue';
import {mobileLayout} from '@/client/wrybit/visuals/common/mobileLayout';
import {GAME_MENU_CONTEXT, GameMenuContext} from '@/client/wrybit/visuals/gameMenu/gameMenuContext';

export default defineComponent({
  name: 'WrybitSpectatorHome',
  mixins: [HomeMixin],
  props: {
    spectator: {
      type: Object as () => SpectatorModel,
      required: true,
    },
  },
  provide() {
    return {[GAME_MENU_CONTEXT as symbol]: computed((): GameMenuContext => ({
      playerName: 'Spectator',
      playerColor: 'neutral',
      deckSize: this.game.deckSize,
      discardPileSize: this.game.discardPileSize,
      coloniesCount: this.game.colonies.length,
      gameOptions: this.game.gameOptions,
      playerNumber: this.spectator.players.length,
      lastSoloGeneration: this.game.lastSoloGeneration,
      otherDeckSizes: this.game.otherDeckSizes,
      spectatorId: this.game.spectatorId,
      expectedPurgeTimeMs: this.game.expectedPurgeTimeMs,
    }))};
  },
  components: {
    HomeColumns,
    GameBoardView,
    KeyboardShortcuts,
    LogPanel,
    MobileSpectatorHome,
    PlayersOverview,
    RowResizeHandle,
    Sidebar,
    WaitingFor,
  },
  computed: {
    game(): GameModel {
      return this.spectator.game;
    },
    mobileLayout(): boolean {
      return mobileLayout.value;
    },
    usesFixedLayout(): boolean {
      return this.game.phase !== 'end';
    },
  },
});
</script>
