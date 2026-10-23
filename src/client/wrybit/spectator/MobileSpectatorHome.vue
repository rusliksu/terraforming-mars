<template>
  <div id="spectator-home" :class="['mb-home', 'mb-home--spectator', 'mb-home--' + screen]">
    <!-- Mobile view for spectators: same building blocks as the player view, without hand, turn and own money. -->
    <header class="mb-topbar">
      <MobileHeader :game="game"/>
    </header>

    <main class="mb-screens">
      <MobileMarsScreen v-show="screen === 'mars'" ref="gameBoardView"
        :game="game" :players="spectator.players" :participant-id="spectator.id" :tile-view="tileView"
        :acting="false" :banner-title="bannerTitle"
        @toggle-tile-view="cycleTileView()" @show-milestones="showMilestones"/>

      <section v-show="screen === 'players'" class="mb-screen mb-screen--players" @scroll.capture="markHorizontalScroll">
        <MobilePlayersPanel :view-model="spectator" :segment="playersSegment" @update:segment="playersSegment = $event"/>
      </section>

      <section v-show="screen === 'log'" class="mb-screen mb-screen--log">
        <LogPanel :view-model="spectator" :zoom-carousel="true" @space-clicked="showSpace"/>
      </section>
    </main>

    <MobileNav :items="navItems" :active="screen" @navigate="go"/>
    <!-- Polls the server regularly for updates, exactly like the desktop spectator view. -->
    <WaitingFor v-show="false" v-if="game.phase !== 'end'" :player-view="spectator" :waitingfor="undefined"/>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {GameModel} from '@/common/models/GameModel';
import {SpectatorModel} from '@/common/models/SpectatorModel';
import {Phase} from '@/common/Phase';
import {SpaceId} from '@/common/Types';
import {HomeMixin} from '@/client/mixins/HomeMixin';
import WaitingFor from '@/client/components/WaitingFor.vue';
import MobileHeader from '@/client/wrybit/mobile/MobileHeader.vue';
import MobileMarsScreen from '@/client/wrybit/mobile/MobileMarsScreen.vue';
import MobileNav from '@/client/wrybit/mobile/MobileNav.vue';
import MobilePlayersPanel from '@/client/wrybit/mobile/MobilePlayersPanel.vue';
import LogPanel from '@/client/wrybit/visuals/logpanel/LogPanel.vue';
import {MobileNavItem, MobileScreen, PlayersSegment, SPECTATOR_NAV} from '@/client/wrybit/mobile/mobileScreens';
import {markHorizontalScroll} from '@/client/wrybit/mobile/horizontalScroll';
import {translateText} from '@/client/directives/i18n';

export default defineComponent({
  name: 'WrybitMobileSpectatorHome',
  mixins: [HomeMixin],
  props: {
    spectator: {
      type: Object as () => SpectatorModel,
      required: true,
    },
  },
  data(): {screen: MobileScreen, playersSegment: PlayersSegment} {
    return {
      screen: 'mars',
      playersSegment: 'players',
    };
  },
  components: {
    LogPanel,
    WaitingFor,
    MobileHeader,
    MobileMarsScreen,
    MobileNav,
    MobilePlayersPanel,
  },
  computed: {
    game(): GameModel {
      return this.spectator.game;
    },
    navItems(): ReadonlyArray<MobileNavItem> {
      return SPECTATOR_NAV;
    },
    bannerTitle(): string {
      if (this.game.phase === Phase.END) {
        return translateText('This game is over!');
      }
      return translateText('Waiting for other players');
    },
  },
  methods: {
    markHorizontalScroll,
    go(screen: MobileScreen): void {
      this.screen = screen;
      window.scrollTo({top: 0});
    },
    showMilestones(): void {
      this.playersSegment = 'ma';
      this.go('players');
    },
    showSpace(spaceId: SpaceId): void {
      this.go('mars');
      this.onSpaceClicked(spaceId);
    },
  },
});
</script>
