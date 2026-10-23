<template>
  <div v-if="isMobileLayout" id="player-home" ref="mobileRoot" class="mb-home" :class="{'mb-home--turn': activeScreen === 'turn'}">
    <header class="mb-topbar">
      <GameMenu/>
      <MobileHeader :game="game"/>
    </header>
    <div class="mb-screens">
      <MobileMarsScreen v-show="activeScreen === 'mars'" ref="gameBoardView" :game="game" :players="playerView.players"
        :participant-id="playerView.id" :tile-view="tileView" :acting="isPlayerActing" :banner-title="bannerTitle"
        :viewer-color="thisPlayer?.color" :viewer="thisPlayer"
        @toggle-tile-view="cycleTileView()" @show-milestones="openMilestones"/>
      <section v-show="activeScreen === 'hand'" class="mb-screen mb-screen--hand">
        <a name="cards" class="player_home_anchor"></a>
        <div v-if="playerView.draftedCards.length > 0" class="mb-drafted">
          <DynamicTitle title="Drafted cards" :color="thisPlayer?.color"/>
          <div v-for="card in playerView.draftedCards" :key="card.name" class="cardbox"><Card :card="card"/></div>
        </div>
        <HandCardsPanel :playerView="playerView"/>
      </section>
      <section v-show="activeScreen === 'turn'" ref="turnSection" class="mb-screen mb-screen--turn">
        <SetupTurnOrder v-if="isSetupPhase" :players="playerView.players"/>
        <div v-if="carousel !== undefined && carousel.count > 1" class="mb-dots">
          <button v-for="index in carousel.count" :key="index" type="button"
            :class="['mb-dot', {'mb-dot--active': index - 1 === carousel.index, 'mb-dot--unavailable': carousel.unavailable[index - 1]}]"
            :aria-label="String(index)" @click="scrollCarousel(index - 1)"></button>
          <span class="mb-dots-count">{{ carousel.index + 1 }} / {{ carousel.count }}</span>
        </div>
        <InputHost v-if="game.phase !== 'end'">
          <WaitingFor :playerView="playerView" :waitingfor="playerView.waitingFor"/>
        </InputHost>
      </section>
      <section v-show="activeScreen === 'players'" class="mb-screen mb-screen--players">
        <MobilePlayersPanel :view-model="playerView" :segment="playersSegment" :viewer-color="thisPlayer?.color"
          @update:segment="playersSegment = $event"/>
      </section>
      <section v-show="activeScreen === 'log'" class="mb-screen mb-screen--log">
        <LogPanel :view-model="playerView" :milestonesAwards="true" :acting="isPlayerActing" :zoom-carousel="true"
          @space-clicked="onSpaceClicked"/>
      </section>
    </div>
    <MobileNav :items="navItems" :active="activeScreen" :hand-count="cardsInHandCount" @navigate="selectScreen">
      <template #turn>
        <MobileTurnButton :acting="isPlayerActing" :action-number="actionNumber" :actions-per-turn="actionsPerTurn"/>
      </template>
    </MobileNav>
    <MobileTurnSheet v-if="sheetOpen" :menu="menu" :waiting-players="waitingPlayers" :title="bannerTitle"
      :action-number="actionNumber" :actions-per-turn="actionsPerTurn"
      @close="sheetOpen = false" @select="startTask" @confirm="confirmTask"/>
    <PurgeWarning :expectedPurgeTimeMs="game.expectedPurgeTimeMs"/>
    <KeyboardShortcuts v-show="keyboardShortcutOpened" @close="keyboardShortcutOpened = false"/>
  </div>
  <div v-else id="player-home" :class="{'with-turmoil': game.turmoil, 'player-home--acting': isPlayerActing}">
    <TopBar :playerView="playerView"/>
    <div v-if="game.phase === 'end'" class="player_home_block">
      <DynamicTitle title="This game is over!" :color="thisPlayer.color"/>
      <a :href="'the-end?id=' + playerView.id" v-i18n>Go to game results</a>
    </div>
    <HomeColumns :boardCollapsed="isSetupPhase && setupBoardCollapsed">
      <template #board>
        <div class="player_home_block player-home-columns__mars">
          <GameBoardView ref="gameBoardView" :game="game" :tileView="tileView" :players="playerView.players" :viewer="playerView.thisPlayer" @toggleTileView="cycleTileView()"/>
        </div>
        <RowResizeHandle v-if="!isSetupPhase" kind="mars"/>
        <a class="hotkey-target"></a>
        <div class="player_home_block nofloat player-home-columns__log">
          <LogPanel :viewModel="playerView" :milestonesAwards="true" :acting="isPlayerActing" @spaceClicked="onSpaceClicked"/>
        </div>
      </template>
      <template #main>
        <a class="hotkey-target"></a>
        <SetupTurnOrder v-if="isSetupPhase" :players="playerView.players"><SetupBoardToggle/></SetupTurnOrder>
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
          <div v-if="playerView.draftedCards.length > 0 && (cardPresentation === undefined || showsDraftedCardsBlock(playerView))" class="player_home_block player_home_block--hand">
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
import {OrOptionsModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {Phase} from '@/common/Phase';
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
import {showsDraftedCardsBlock} from '@/client/wrybit/inputs/draftCards';
import {hasWaitingForTabs} from '@/client/wrybit/inputs/waitingForTabs';
import SetupBoardToggle from '@/client/wrybit/inputs/SetupBoardToggle.vue';
import {setupBoardCollapsed} from './layout/setupBoardCollapsed';
import GameMenu from './gameMenu/GameMenu.vue';
import MobileHeader from '@/client/wrybit/mobile/MobileHeader.vue';
import MobileMarsScreen from '@/client/wrybit/mobile/MobileMarsScreen.vue';
import MobileNav from '@/client/wrybit/mobile/MobileNav.vue';
import MobilePlayersPanel from '@/client/wrybit/mobile/MobilePlayersPanel.vue';
import MobileTurnButton from '@/client/wrybit/mobile/MobileTurnButton.vue';
import MobileTurnSheet from '@/client/wrybit/mobile/MobileTurnSheet.vue';
import {buildTurnMenu, findTurnMenuTile, isActionMenuInput, selectTurnMenuTile, submitTurnMenuTile, TurnMenu} from '@/client/wrybit/mobile/turnMenu';
import {CarouselState, observeCardCarousel, scrollCarouselTo} from '@/client/wrybit/mobile/cardCarousel';
import {MOBILE_NAV, MobileNavItem, MobileScreen, PlayersSegment, SPECTATOR_NAV} from '@/client/wrybit/mobile/mobileScreens';
import {mobileLayout} from './common/mobileLayout';
import {translateMessage, translateText} from '@/client/directives/i18n';

// The first mount after a full page load keeps the remembered screen; later server steps open
// a newly delivered action menu as a sheet (the same distinction as the source MobilePlayerHome).
let pageJustLoaded = true;

export default defineComponent({
  name: 'WrybitPlayerHome',
  setup() {
    return {orPresentation: useInputPresentation('or'), waitingPresentation: useInputPresentation('waitingFor'), cardPresentation: useInputPresentation('card'), showsDraftedCardsBlock, setupBoardCollapsed};
  },
  mixins: [HomeMixin],
  props: {playerView: {type: Object as () => PlayerViewModel, required: true}},
  components: {InputHost, WaitingFor, TopBar, PurgeWarning, DynamicTitle, HomeColumns, RowResizeHandle, PlayerSetupView,
    SetupTurnOrder, PlayersOverview, GameBoardView, LogPanel, Card, HandCardsTab, HandCardsPanel, KeyboardShortcuts, SetupBoardToggle,
    GameMenu, MobileHeader, MobileMarsScreen, MobileNav, MobilePlayersPanel, MobileTurnButton, MobileTurnSheet},
  directives: {dockedTab: vDockedTab},
  provide() {
    return {[GAME_MENU_CONTEXT as symbol]: computed((): GameMenuContext => ({
      playerName: this.thisPlayer.name, playerColor: this.thisPlayer.color,
      deckSize: this.game.deckSize, discardPileSize: this.game.discardPileSize, coloniesCount: this.game.colonies.length,
      gameOptions: this.game.gameOptions, playerNumber: this.playerView.players.length, lastSoloGeneration: this.game.lastSoloGeneration,
      otherDeckSizes: this.game.otherDeckSizes, spectatorId: this.game.spectatorId, expectedPurgeTimeMs: this.game.expectedPurgeTimeMs,
    }))};
  },
  data() {
    // A mandatory step that is not the action menu is a task: open it directly (also after App remounts
    // this component for a new server step; action menus keep the remembered screen and open as a sheet).
    const waitingFor = this.playerView.waitingFor;
    const mandatory = waitingFor !== undefined && !waitingFor.optional;
    const menu = isActionMenuInput(waitingFor);
    const openSheet = menu && !pageJustLoaded && mobileLayout.value;
    pageJustLoaded = false;
    return {
      activeScreen: (mandatory && !menu ? 'turn' : 'mars') as MobileScreen,
      playersSegment: 'players' as PlayersSegment,
      sheetOpen: openSheet,
      carousel: undefined as CarouselState | undefined,
      stopCarousel: undefined as (() => void) | undefined,
    };
  },
  computed: {
    isMobileLayout(): boolean {
      return mobileLayout.value;
    },
    navItems(): ReadonlyArray<MobileNavItem> {
      return this.playerView.thisPlayer === undefined ? SPECTATOR_NAV : MOBILE_NAV;
    },
    bannerTitle(): string {
      const title = this.playerView.waitingFor?.title;
      if (!this.isPlayerActing || title === undefined) {
        return translateText('Waiting for other players');
      }
      return typeof title === 'string' ? translateText(title) : translateMessage(title);
    },
    hasHandInInputTabs(): boolean {
      return (this.orPresentation !== undefined && this.playerView.waitingFor?.type === 'or') ||
        (this.waitingPresentation !== undefined && hasWaitingForTabs(this.playerView.waitingFor));
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
      // Solo games have one player but still wait for the own mandatory input.
      return this.playerView.waitingFor !== undefined && !this.playerView.waitingFor.optional;
    },
    cardsInHandCount(): number {
      return this.playerView.cardsInHand.length + this.playerView.preludeCardsInHand.length + this.playerView.ceoCardsInHand.length;
    },
    isActionMenu(): boolean {
      return isActionMenuInput(this.playerView.waitingFor);
    },
    menu(): TurnMenu | undefined {
      return this.isActionMenu ? buildTurnMenu(this.playerView.waitingFor as OrOptionsModel) : undefined;
    },
    waitingPlayers(): ReadonlyArray<PublicPlayerModel> {
      return this.playerView.players.filter((player) => player.isActive);
    },
    actionsPerTurn(): number {
      return 2;
    },
    actionNumber(): number | undefined {
      if (!this.isPlayerActing || this.game.phase !== Phase.ACTION) {
        return undefined;
      }
      return Math.min((this.thisPlayer?.actionsTakenThisRound ?? 0) + 1, this.actionsPerTurn);
    },
  },
  watch: {
    isMobileLayout(active: boolean): void {
      if (active) {
        // The watcher runs before the mobile branch is in the DOM; wait for its ref.
        this.$nextTick(() => this.startCarousel());
      } else {
        this.stopCarousel?.();
        this.stopCarousel = undefined;
        this.carousel = undefined;
      }
    },
  },
  mounted() {
    this.$nextTick(() => this.startCarousel());
  },
  beforeUnmount() {
    this.stopCarousel?.();
  },
  methods: {
    selectScreen(screen: MobileScreen): void {
      // The footer "Turn" opens the action menu as a sheet; other mandatory inputs open their task directly.
      if (screen === 'turn' && !this.isSetupPhase && (this.isActionMenu || !this.isPlayerActing)) {
        this.sheetOpen = true;
        return;
      }
      this.activeScreen = screen;
    },
    openMilestones(): void {
      this.activeScreen = 'players';
      this.playersSegment = 'ma';
    },
    startTask(index: number): void {
      this.sheetOpen = false;
      this.activeScreen = 'turn';
      this.$nextTick(() => {
        const section = this.$refs.turnSection as HTMLElement | undefined;
        if (section !== undefined) {
          selectTurnMenuTile(section, index);
        }
      });
    },
    confirmTask(index: number): void {
      const tile = findTurnMenuTile(this.menu, index);
      if (tile?.confirmation?.action === 'place') {
        this.startTask(index);
        return;
      }
      this.sheetOpen = false;
      this.$nextTick(() => {
        const section = this.$refs.turnSection as HTMLElement | undefined;
        if (section !== undefined) {
          void submitTurnMenuTile(section, index);
        }
      });
    },
    scrollCarousel(index: number): void {
      const section = this.$refs.turnSection as HTMLElement | undefined;
      if (section !== undefined) {
        scrollCarouselTo(section, index);
      }
    },
    startCarousel(): void {
      this.stopCarousel?.();
      this.stopCarousel = undefined;
      const root = this.$refs.mobileRoot;
      if (!(root instanceof HTMLElement)) {
        return;
      }
      this.stopCarousel = observeCardCarousel(root, (state) => {
        this.carousel = state;
      });
    },
  },
});
</script>
