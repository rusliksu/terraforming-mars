<template>
  <div id="player-home" :class="{'with-turmoil': game.turmoil, 'player-home--acting': isPlayerActing}">
    <TopBar :playerView="playerView"/>
    <div v-if="game.phase === 'end'" class="player_home_block">
      <DynamicTitle title="This game is over!" :color="thisPlayer.color"/>
      <a :href="'the-end?id=' + playerView.id" v-i18n>Go to game results</a>
    </div>
    <HomeColumns>
      <template #board>
        <div class="player_home_block player-home-columns__mars">
          <GameBoardView ref="gameBoardView" :game="game" :tileView="tileView" :players="playerView.players" @toggleTileView="cycleTileView()"/>
        </div>
        <RowResizeHandle v-if="!isSetupPhase" kind="mars"/>
        <a class="hotkey-target"></a>
        <div class="player_home_block nofloat player-home-columns__log">
          <LogPanel :viewModel="playerView" milestonesAwards :acting="isPlayerActing" @spaceClicked="onSpaceClicked"/>
        </div>
      </template>
      <template #main>
        <a class="hotkey-target"></a>
        <SetupTurnOrder v-if="isSetupPhase" :players="playerView.players"/>
        <PlayersOverview v-else class="player_home_block player_home_block--players nofloat" :playerView="playerView" id="shortkey-playersoverview"/>
        <RowResizeHandle v-if="!isSetupPhase" kind="players"/>
        <PlayerSetupView v-if="isSetupPhase" :playerView="playerView"/>
        <template v-else>
          <a class="hotkey-target"></a>
          <div class="player_home_block player_home_block--actions nofloat">
            <a name="actions" class="player_home_anchor"></a>
            <InputHost v-if="game.phase !== 'end'">
              <WaitingFor :playerView="playerView" :waitingfor="playerView.waitingFor"/>
            </InputHost>
          </div>
          <div v-if="playerView.draftedCards.length > 0" class="player_home_block player_home_block--hand">
            <DynamicTitle title="Drafted cards" :color="thisPlayer.color"/>
            <div v-for="card in playerView.draftedCards" :key="card.name" class="cardbox"><Card :card="card"/></div>
          </div>
          <a name="cards" class="player_home_anchor"></a>
          <div v-if="!hasHandInInputTabs" class="player_home_block player_home_block--hand" id="shortkey-hand">
            <div class="or-tabs" role="tablist"><HandCardsTab :count="cardsInHandCount" :active="true"/></div>
            <div v-docked-tab class="or-tab-panel or-tab-panel--view" role="tabpanel"><HandCardsPanel :playerView="playerView"/></div>
          </div>
        </template>
      </template>
    </HomeColumns>
    <PurgeWarning :expectedPurgeTimeMs="game.expectedPurgeTimeMs"/>
    <KeyboardShortcuts v-show="keyboardShortcutOpened" @close="keyboardShortcutOpened = false"/>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent} from 'vue';
import {HomeMixin} from '@/client/mixins/HomeMixin';
import {GameModel} from '@/common/models/GameModel';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import InputHost from '@/client/wrybit/shell/InputHost.vue';
import WaitingFor from '@/client/components/WaitingFor.vue';
import TopBar from '@/client/components/TopBar.vue';
import PurgeWarning from '@/client/components/common/PurgeWarning.vue';
import DynamicTitle from '@/client/components/common/DynamicTitle.vue';
import HomeColumns from './HomeColumns.vue';
import RowResizeHandle from './RowResizeHandle.vue';
import PlayerSetupView from './PlayerSetupView.vue';
import SetupTurnOrder from './SetupTurnOrder.vue';
import PlayersOverview from './overview/PlayersOverview.vue';
import GameBoardView from './GameBoardView.vue';
import LogPanel from './logpanel/LogPanel.vue';
import Card from './card/Card.vue';
import HandCardsTab from './HandCardsTab.vue';
import HandCardsPanel from './HandCardsPanel.vue';
import KeyboardShortcuts from './KeyboardShortcuts.vue';
import {vDockedTab} from './common/DockedTab';
import {GAME_MENU_CONTEXT, GameMenuContext} from './gameMenu/gameMenuContext';
import {useInputPresentation} from '@/client/wrybit/inputs/presentation';

export default defineComponent({
  name: 'WrybitPlayerHome',
  setup() {
    return {orPresentation: useInputPresentation('or')};
  },
  mixins: [HomeMixin],
  props: {playerView: {type: Object as () => PlayerViewModel, required: true}},
  components: {InputHost, WaitingFor, TopBar, PurgeWarning, DynamicTitle, HomeColumns, RowResizeHandle, PlayerSetupView,
    SetupTurnOrder, PlayersOverview, GameBoardView, LogPanel, Card, HandCardsTab, HandCardsPanel, KeyboardShortcuts},
  directives: {dockedTab: vDockedTab},
  provide() {
    return {[GAME_MENU_CONTEXT as symbol]: computed((): GameMenuContext => ({
      playerName: this.thisPlayer.name, playerColor: this.thisPlayer.color,
      deckSize: this.game.deckSize, discardPileSize: this.game.discardPileSize, coloniesCount: this.game.colonies.length,
      gameOptions: this.game.gameOptions, playerNumber: this.playerView.players.length, lastSoloGeneration: this.game.lastSoloGeneration,
      otherDeckSizes: this.game.otherDeckSizes, spectatorId: this.game.spectatorId, expectedPurgeTimeMs: this.game.expectedPurgeTimeMs,
    }))};
  },
  computed: {
    hasHandInInputTabs(): boolean {
      return this.orPresentation !== undefined && this.playerView.waitingFor?.type === 'or';
    },
    game(): GameModel {
      return this.playerView.game;
    },
    thisPlayer(): PublicPlayerModel {
      return this.playerView.thisPlayer;
    },
    isSetupPhase(): boolean {
      return this.thisPlayer.tableau.length === 0;
    },
    isPlayerActing(): boolean {
      return this.playerView.players.length > 1 && this.playerView.waitingFor !== undefined && !this.playerView.waitingFor.optional;
    },
    cardsInHandCount(): number {
      return this.playerView.cardsInHand.length + this.playerView.preludeCardsInHand.length + this.playerView.ceoCardsInHand.length;
    },
  },
});
</script>
