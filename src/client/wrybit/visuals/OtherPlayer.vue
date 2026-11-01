<template>
  <div v-show="isVisible()" class="other_player_panel">
    <div :class="'player_translucent_bg_color_' + player.color" class="other_player_header">
      <div class="player_name">{{ player.name }} <span v-i18n>played cards</span></div>
      <AppButton size="big" type="close" @click="hideMe" :disableOnServerBusy="false" align="right" />
    </div>
    <div class="other_player_cont menu">
      <CardFilterBar v-if="player.tableau.length > 1" :cards="player.tableau" :filter="playedCardFilter" :context="filterContext">
        <template #sort="{compact}">
          <CardSortMenu :modelValue="playedCardsSortOrder" :compact="compact" @update:modelValue="setPlayedSortOrder" />
        </template>
      </CardFilterBar>
      <div v-if="player.tableau.length > 0" class="player_home_block">
        <CardFilterEmptyHint v-if="nothingShown" @reset="resetCardFilter(playedCardFilter)" />
        <PlayedCardsGroups :player="player" :visibility="visibilityOf" :sortOrder="playedCardsSortOrder" />
      </div>
      <div v-if="player.selfReplicatingRobotsCards.length > 0" class="player_home_block">
        <span v-i18n>Self-replicating Robots cards</span>
        <div>
          <div v-for="card in player.selfReplicatingRobotsCards" :key="card.name" class="cardbox">
            <Card :card="card" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalOtherPlayer from '@/client/components/OtherPlayer.vue';
import Card from '@/client/wrybit/visuals/card/Card.vue';
import PlayedCardsGroups from '@/client/wrybit/visuals/PlayedCardsGroups.vue';
import CardFilterBar from '@/client/wrybit/visuals/cardfilter/CardFilterBar.vue';
import CardFilterEmptyHint from '@/client/wrybit/visuals/cardfilter/CardFilterEmptyHint.vue';
import CardSortMenu from '@/client/wrybit/visuals/cardfilter/CardSortMenu.vue';
import {CardFilterContext, resetCardFilter} from '@/client/wrybit/visuals/cardfilter/cardFilter';
import {cardVisibility, playedCardFilter, playedCardsSortOrder, unmatchedCards} from '@/client/wrybit/visuals/cardfilter/cardFilterState';
import {CardVisibility} from '@/client/wrybit/visuals/common/cardVisibility';
import {CardModel} from '@/common/models/CardModel';
import {SortOrder} from '@/client/utils/SortOrder';

export default defineComponent({
  name: 'OtherPlayer',
  extends: CanonicalOtherPlayer,
  components: {Card, PlayedCardsGroups, CardFilterBar, CardFilterEmptyHint, CardSortMenu},
  methods: {
    resetCardFilter,
    visibilityOf(card: CardModel): CardVisibility {
      return cardVisibility(card, playedCardFilter, this.filterContext);
    },
    setPlayedSortOrder(value: SortOrder | undefined): void {
      playedCardsSortOrder.value = value;
    },
  },
  computed: {
    playedCardFilter(): typeof playedCardFilter {
      return playedCardFilter;
    },
    playedCardsSortOrder(): SortOrder | undefined {
      return playedCardsSortOrder.value;
    },
    filterContext(): CardFilterContext {
      return {withCost: false};
    },
    nothingShown(): boolean {
      return this.player.tableau.length > 1 && unmatchedCards.value === 'hide' && this.player.tableau.every((card) => this.visibilityOf(card) !== 'shown');
    },
  },
});
</script>
