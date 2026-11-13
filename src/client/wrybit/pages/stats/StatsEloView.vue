<template>
  <section class="stats-card stats-elo">
    <h2 class="stats-elo-title" v-i18n>Rating</h2>
    <p class="stats-note stats-dim" v-i18n>Elo is counted only from finished games between our players: bots and test line-ups stay out.</p>
    <StatsTable :columns="columns" :rows="ratings" :rowKey="rowKey" initialSort="elo" />
  </section>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import StatsTable from './StatsTable.vue';
import {StatsRating} from './statsApi';
import {StatsColumn} from './statsTypes';

// Rating list in the same table style as every other statistics tab; the numbers come from the
// public ELO history, so the page never derives a second, different rating of its own.
export default defineComponent({
  name: 'StatsEloView',
  components: {StatsTable},
  props: {
    ratings: {type: Array as PropType<ReadonlyArray<StatsRating>>, required: true},
  },
  computed: {
    columns(): Array<StatsColumn> {
      return [
        {key: 'player', label: 'Player', text: true, value: (row: StatsRating) => row.displayName},
        {key: 'elo', label: 'Elo', value: (row: StatsRating) => row.elo},
        {key: 'games', label: 'Games', value: (row: StatsRating) => row.games},
        {key: 'wins', label: 'Wins', value: (row: StatsRating) => row.wins},
        {key: 'top3', label: 'Top 3', value: (row: StatsRating) => row.top3},
        {key: 'averageVictoryPoints', label: 'Avg. points', value: (row: StatsRating) => row.averageVictoryPoints,
          format: (row: StatsRating) => row.averageVictoryPoints === undefined ? '–' : String(row.averageVictoryPoints)},
      ];
    },
  },
  methods: {
    rowKey(row: StatsRating): string {
      return row.displayName;
    },
  },
});
</script>
