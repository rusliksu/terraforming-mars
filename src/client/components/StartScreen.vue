<template>
<div class="start-screen">
  <div v-i18n class="start-screen-links">
    <div class="start-screen-header start-screen-link--title">
      <div class="start-screen-title-top">TERRAFORMING</div>
      <div class="start-screen-title-bottom">MARS</div>
    </div>
    <a class="start-screen-link start-screen-link--new-game" href="new-game" v-i18n>New game</a>
    <a class="start-screen-link start-screen-link--how-to-play" href="/elo/">Game History & Elo</a>
    <a class="start-screen-link start-screen-link--how-to-play" href="https://github.com/rusliksu/terraforming-mars/wiki/Rulebooks" target="_blank" v-i18n>How to Play</a>
    <a class="start-screen-link start-screen-link--cards-list" href="cards" target="_blank" v-i18n>Cards list</a>
    <a class="start-screen-link start-screen-link--cards-list" href="/tierlist/" target="_blank">Tier List</a>
    <a class="start-screen-link start-screen-link--board-game" href="https://boardgamegeek.com/boardgame/167791/terraforming-mars" target="_blank" v-i18n>Board game</a>
    <a class="start-screen-link start-screen-link--about" href="https://github.com/rusliksu/terraforming-mars#README" target="_blank" v-i18n>About us</a>
    <a class="start-screen-link start-screen-link--changelog" href="https://github.com/rusliksu/terraforming-mars/wiki/Changelog" target="_blank" v-i18n>Whats new?</a>
    <a class="start-screen-link start-screen-link--chat" :href="DISCORD_INVITE" target="_blank" v-i18n>Join us on Discord</a>
    <section class="start-screen-live-games" aria-label="Current games">
      <div class="start-screen-live-games__header">
        <span v-i18n>Current games</span>
        <span v-if="liveGamesStatus === 'loading'" class="start-screen-live-games__status" v-i18n>loading</span>
      </div>
      <a
        v-for="game in liveGames"
        :key="game.id"
        class="start-screen-live-game"
        :href="spectatorHref(game)"
        :aria-label="'Spectate game: ' + playerNames(game)"
      >
        <span class="start-screen-live-game__dot"></span>
        <span class="start-screen-live-game__players">{{ playerNames(game) }}</span>
      </a>
      <div v-if="liveGamesStatus === 'loaded' && liveGames.length === 0" class="start-screen-live-games__empty" v-i18n>No games online</div>
      <div v-if="liveGamesStatus === 'error'" class="start-screen-live-games__empty" v-i18n>Could not load current games</div>
    </section>
    <div class="start-screen-header start-screen-link--languages">
      <language-switcher />
      <div class="start-screen-version-cont">
        <div class="nowrap start-screen-date"><span v-i18n>deployed</span>: {{raw_settings.builtAt}}</div>
        <div class="nowrap start-screen-version"><span v-i18n>version</span>: {{raw_settings.head}}</div>
      </div>
      <div class="source-code">
        <a href="https://github.com/rusliksu/terraforming-mars" target="_blank" class="source-code-text">
        <img src="assets/misc/github.png" class="source-code-img">
          source code
        </a>
      </div>
    </div>
  </div>
  <div class="free-floating-preferences-icon">
    <preferences-icon></preferences-icon>
  </div>
</div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import LanguageSwitcher from '@/client/components/LanguageSwitcher.vue';
import PreferencesIcon from '@/client/components/PreferencesIcon.vue';

import raw_settings from '@/genfiles/settings.json';
import {paths} from '@/common/app/paths';
import * as constants from '@/common/constants';
import {Phase} from '@/common/Phase';
import {LiveGameModel} from '@/common/models/LiveGameModel';

type LiveGamesStatus = 'loading' | 'loaded' | 'error';

export default defineComponent({
  name: 'start-screen',
  components: {
    LanguageSwitcher,
    PreferencesIcon,
  },
  data(): {liveGames: Array<LiveGameModel>, liveGamesStatus: LiveGamesStatus} {
    return {
      liveGames: [],
      liveGamesStatus: 'loading',
    };
  },
  mounted() {
    this.getLiveGames();
  },
  computed: {
    raw_settings(): typeof raw_settings {
      return raw_settings;
    },
    DISCORD_INVITE(): string {
      return constants.DISCORD_INVITE;
    },
  },
  methods: {
    async getLiveGames(): Promise<void> {
      try {
        const response = await fetch(paths.API_LIVE_GAMES);
        if (!response.ok) {
          this.liveGamesStatus = 'error';
          return;
        }
        const games = await response.json() as Array<LiveGameModel>;
        this.liveGames = Array.isArray(games) ?
          games.filter((game) => game.phase !== Phase.END) :
          [];
        this.liveGamesStatus = 'loaded';
      } catch (error) {
        this.liveGamesStatus = 'error';
      }
    },
    playerNames(game: LiveGameModel): string {
      return game.players.map((player) => player.name).join(' / ');
    },
    spectatorHref(game: LiveGameModel): string {
      return game.spectatorId === undefined ? 'game?id=' + game.id : 'spectator?id=' + game.spectatorId;
    },
  },
});

</script>
