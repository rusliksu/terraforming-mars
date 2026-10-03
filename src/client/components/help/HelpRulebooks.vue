<template>
  <div class="help-rulebooks-container">
    <div class="help-rulebooks-section">
      <div class="help-icons-section-heading" v-i18n>Official Expansions</div>
      <div class="help-rulebook-rows">
        <a v-for="entry in officialExpansions" :key="entry.module" :href="entry.url" class="help-rulebook-row" target="_blank" v-i18n>
          <div :class="`create-game-expansion-icon expansion-icon-${entry.iconClass}`"></div>
          {{ entry.name }}
        </a>
      </div>
    </div>
    <div class="help-rulebooks-section">
      <div class="help-icons-section-heading" v-i18n>Fan Expansions</div>
      <div class="help-rulebook-rows">
        <a v-for="entry in fanExpansions" :key="entry.module" :href="entry.url" class="help-rulebook-row" target="_blank" v-i18n>
          <div :class="`create-game-expansion-icon expansion-icon-${entry.iconClass}`"></div>
          {{ entry.name }}
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {RULEBOOK_URLS} from '@/client/utils/WikiLinks';

interface RulebookEntry {
  module: string;
  name: string;
  iconClass: string;
  url: string;
}

const officialExpansions: ReadonlyArray<RulebookEntry> = [
  {module: 'corpera', name: 'Corporate Era', iconClass: 'CE', url: RULEBOOK_URLS.corpera},
  {module: 'venus', name: 'Venus Next', iconClass: 'venus', url: RULEBOOK_URLS.venus},
  {module: 'prelude', name: 'Prelude', iconClass: 'prelude', url: RULEBOOK_URLS.prelude},
  {module: 'prelude2', name: 'Prelude 2', iconClass: 'prelude2', url: RULEBOOK_URLS.prelude2},
  {module: 'colonies', name: 'Colonies', iconClass: 'colony', url: RULEBOOK_URLS.colonies},
  {module: 'turmoil', name: 'Turmoil', iconClass: 'turmoil', url: RULEBOOK_URLS.turmoil},
];

const fanExpansions: ReadonlyArray<RulebookEntry> = [
  {module: 'promo', name: 'Promos', iconClass: 'promo', url: RULEBOOK_URLS.promo},
  {module: 'ares', name: 'Ares', iconClass: 'ares', url: RULEBOOK_URLS.ares},
  {module: 'community', name: 'Community', iconClass: 'community', url: RULEBOOK_URLS.community},
  {module: 'moon', name: 'The Moon', iconClass: 'themoon', url: RULEBOOK_URLS.moon},
  {module: 'pathfinders', name: 'Pathfinders', iconClass: 'pathfinders', url: RULEBOOK_URLS.pathfinders},
  {module: 'ceo', name: 'CEOs', iconClass: 'ceo', url: RULEBOOK_URLS.ceo},
  {module: 'starwars', name: 'Star Wars', iconClass: 'starwars', url: RULEBOOK_URLS.starwars},
  {module: 'underworld', name: 'Underworld', iconClass: 'underworld', url: RULEBOOK_URLS.underworld},
  {module: 'deltaProject', name: 'Delta Project', iconClass: 'deltaProject', url: RULEBOOK_URLS.deltaProject},
  {module: 'sillyfication', name: 'Sillyfication', iconClass: 'sillyfication', url: RULEBOOK_URLS.sillyfication},
  {module: 'betterMars', name: 'BetterMars', iconClass: 'betterMars', url: RULEBOOK_URLS.betterMars},
  {module: 'customCards', name: 'Custom Cards', iconClass: 'customCards', url: RULEBOOK_URLS.customCards},
  {module: 'conglomerates', name: 'Conglomerates', iconClass: 'conglomerates', url: RULEBOOK_URLS.conglomerates},
  {module: 'corporateBetterments', name: 'Corporate Betterments', iconClass: 'corporateBetterments', url: RULEBOOK_URLS.corporateBetterments},
  {module: 'idesOfMars', name: 'Ides of Mars', iconClass: 'idesOfMars', url: RULEBOOK_URLS.idesOfMars},
  {module: 'robAntilles', name: 'Rob Antilles', iconClass: 'robAntilles', url: RULEBOOK_URLS.robAntilles},
  {module: 'moreParties', name: 'More Parties', iconClass: 'moreParties', url: RULEBOOK_URLS.moreParties},
  {module: 'venusPhase2', name: 'Venus: Phase 2', iconClass: 'venusPhase2', url: RULEBOOK_URLS.venusPhase2},
  {module: 'industries', name: 'Industries', iconClass: 'industries', url: RULEBOOK_URLS.industries},
  {module: 'highOrbit', name: 'High Orbit', iconClass: 'highOrbit', url: RULEBOOK_URLS.highOrbit},
  {module: 'solaris', name: 'Solaris', iconClass: 'solaris', url: RULEBOOK_URLS.solaris},
];

export default defineComponent({
  name: 'HelpRulebooks',
  data() {
    return {
      officialExpansions,
      fanExpansions,
    };
  },
});
</script>
