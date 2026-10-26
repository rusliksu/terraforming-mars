<template>
  <div class="ma-block">
    <div class="ma-player" v-if="award.playerName">
      <BoardCube v-if="award.color !== undefined" :title="award.playerName" class="board-cube" :color="award.color" view="slight"/>
    </div>

    <div class="ma-name ma-name--awards award-block" :class="nameCss">
      <span ref="name" v-i18n>{{ award.name }}</span>
      <div v-if="award.teamScores !== undefined" class="ma-team-scores">
        <span
          v-for="(team, idx) in award.teamScores"
          :key="idx"
          class="ma-team-score"
          :class="team.teamColor !== undefined ? `ma-team-score--${team.teamColor}` : ''"
          data-test="team-score"
        >{{ team.score }}</span>
      </div>
      <div v-if="showScores" class="ma-scores player_home_block--milestones-and-awards-scores">
        <template v-for="score in sortedScores" :key="score.color">
          <p
            v-if="playerSymbol(score.color).length > 0"
            class="ma-score"
            :class="`player_bg_color_${score.color}`"
            v-text="playerSymbol(score.color)"
            data-test="player-score"
          ></p>
          <p
            class="ma-score"
            :class="`player_bg_color_${score.color}`"
            v-text="score.score"
            data-test="player-score"
          ></p>
      </template>
      </div>
    </div>

    <div v-if="showDescription" class="ma-description">
      <span v-i18n>{{ description }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalAward from '@/client/components/Award.vue';
import BoardCube from '@/client/wrybit/visuals/common/BoardCube.vue';

// Canonical owner retains costs, claimability, team scores and descriptions.
export default defineComponent({
  name: 'WrybitAward',
  extends: CanonicalAward,
  components: {BoardCube},
});
</script>
