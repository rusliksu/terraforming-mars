<template>
      <!-- The whole player bar is clickable and opens the played cards -->
      <div :class="getClasses()" @click="togglePlayerDetails">
        <div class="player-status-and-res">
        <div class="player-status">
          <div class="player-info-details">
            <div class="player-info-name-row">
              <span class="player-info-name">{{ playerSymbol + player.name }}</span>
              <span v-if="player.isBotControlled" class="bot-controlled-marker" :title="$t('This player is controlled by a bot')" role="status">BOT</span>
              <span @click.stop><PlayerEloBadge v-if="!readOnly" :playerName="player.name" :tooltipCss="tooltipCss" :compact="true" :eloDelta="eloDelta"/></span>
            </div>
            <span v-if="player.color === 'credicor'" class="player-persona-title">Магистр Кредикора</span>
            <span v-for="(corporationName, index) in getCorporationName()" :key="index" v-i18n>
              <div class="player-info-corp" :title="$t(corporationName)">
                {{ corporationName }}
              </div>
            </span>
          </div>
          <div>
            <div class="icon-first-player" v-if="firstForGen && playerView.players.length > 1" v-i18n>1st</div>
            <PlayerStatus :timer="player.timer" :showTimer="playerView.game.gameOptions.showTimers" :liveTimer="!readOnly && playerView.game.phase !== Phase.END" :firstForGen="firstForGen" v-trim-whitespace :actionLabel="actionLabel"/>
          </div>
        </div>
          <PlayerResources :conglomeratesExpansion="playerView.game.gameOptions.expansions.conglomerates" :player="player" v-trim-whitespace />
          <div class="player-played-cards">
            <!-- No click handler of its own: the click bubbles up to the bar; button stays for keyboard use -->
            <button type="button" class="btn btn-tiny btn-rounded played-cards-button">
              <span>{{ $t(buttonLabel()) }}</span>
              <span class="played-cards-count">{{ numberOfPlayedCards() }}</span>
            </button>
          </div>
          <div class="tag-display player-board-blue-action-counter" :class="tooltipCss" :data-tooltip="$t('The number of available actions on active cards')">
            <div class="tag-count tag-action-card">
              <div class="blue-stripe"></div>
              <div class="red-arrow"></div>
            </div>
            <span class="tag-count-display">{{ availableBlueActionCount() }}</span>
          </div>
        </div>
        <PlayerTags :player="player" :playerView="playerView" :hideZeroTags="hideZeroTags" :isTopBar="isTopBar" />
        <PlayerAlliedParty :player="player" :morePartiesExpansion="playerView.game.gameOptions.expansions.moreParties"/>
      </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalPlayerInfo from '@/client/components/overview/PlayerInfo.vue';
import PlayerResources from '@/client/wrybit/visuals/overview/PlayerResources.vue';
import PlayerTags from '@/client/wrybit/visuals/overview/PlayerTags.vue';
import PlayerStatus from './PlayerStatus.vue';
import {togglePlayerCards} from '@/client/wrybit/visuals/common/playerCardsToggle';
import {vueRoot} from '@/client/components/vueRoot';

export default defineComponent({
  name: 'PlayerInfo',
  extends: CanonicalPlayerInfo,
  components: {PlayerResources, PlayerTags, PlayerStatus},
  methods: {
    buttonLabel(): string {
      return this.isPinned(this.playerIndex) ? 'hide' : 'show';
    },
    togglePlayerDetails() {
      togglePlayerCards(vueRoot(this), this.playerIndex, this.playerView.players.length);
    },
  },
});
</script>
