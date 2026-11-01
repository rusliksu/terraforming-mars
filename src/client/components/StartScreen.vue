<template>
  <div class="start-screen">
    <div v-i18n class="start-screen-links">
      <div class="start-screen-header start-screen-link--title">
        <div class="start-screen-title-top">TERRAFORMING</div>
        <div class="start-screen-title-bottom">MARS</div>
      </div>
      <a class="start-screen-link start-screen-link--new-game" href="new-game"
        :title="$t('Create a game, then share its lobby link with the other players')"
        :aria-label="$t('New game')" v-i18n>New game</a>
      <a class="start-screen-link start-screen-link--how-to-play" href="/elo/">Game History & Elo</a>
      <a class="start-screen-link start-screen-link--how-to-play" href="https://github.com/rusliksu/terraforming-mars/wiki/Rulebooks" target="_blank" v-i18n>How to Play</a>
      <a class="start-screen-link start-screen-link--cards-list" href="cards" target="_blank" v-i18n>Cards list</a>
      <a class="start-screen-link start-screen-link--cards-list" href="/tierlist/" target="_blank">Tier List</a>
      <a class="start-screen-link start-screen-link--map-library" href="map-library" v-i18n>Map library</a>
      <a class="start-screen-link start-screen-link--card-maker" href="card-maker" v-i18n>Card maker</a>
      <a class="start-screen-link start-screen-link--board-game" href="https://boardgamegeek.com/boardgame/167791/terraforming-mars" target="_blank" v-i18n>Board game</a>
      <a class="start-screen-link start-screen-link--about" href="https://github.com/rusliksu/terraforming-mars#README" target="_blank" v-i18n>About us</a>
      <a class="start-screen-link start-screen-link--changelog" href="https://github.com/rusliksu/terraforming-mars/wiki/Changelog" target="_blank" v-i18n>Whats new?</a>
      <a class="start-screen-link start-screen-link--chat" :href="DISCORD_INVITE" target="_blank" v-i18n>Join us on Discord</a>
      <div class="start-screen-header start-screen-link--languages">
        <LanguageSwitcher />
        <div class="start-screen-version-cont">
          <div class="nowrap start-screen-date"><span v-i18n>deployed</span>: {{ raw_settings.builtAt }}</div>
          <div class="nowrap start-screen-version"><span v-i18n>version</span>: {{ raw_settings.head }}</div>
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
      <LanguageIcon class="corner-language-icon" />
      <PreferencesIcon />
    </div>
  </div>
</template>

<script setup lang="ts">
import {DISCORD_INVITE} from '@/common/constants';
import { onBeforeUnmount, onMounted } from 'vue';
import LanguageSwitcher from '@/client/components/LanguageSwitcher.vue';
import LanguageIcon from '@/client/components/LanguageIcon.vue';
import PreferencesIcon from '@/client/components/PreferencesIcon.vue';
import {releaseDeviceViewport, requestDeviceViewport} from '@/client/utils/viewport';

import raw_settings from '@/genfiles/settings.json';

// The start screen lays out at the device width so phones get their real CSS viewport.
// The shared controller restores the classic 1260px viewport when this screen unmounts.
const VIEWPORT_OWNER = 'classic-start-screen';

onMounted(() => requestDeviceViewport(VIEWPORT_OWNER));

onBeforeUnmount(() => releaseDeviceViewport(VIEWPORT_OWNER));
</script>
