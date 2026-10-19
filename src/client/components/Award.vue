<template>
  <div class="ma-block">
    <div class="ma-player" v-if="award.playerName">
      <i :title="award.playerName" :class="playerCubeCss(award.color)"></i>
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
import {FundedAwardModel, AwardScore} from '@/common/models/FundedAwardModel';
import {getAward} from '@/client/MilestoneAwardManifest';
import {playerSymbol} from '@/client/utils/playerSymbol';
import {Color, isReservedPlayerColor} from '@/common/Color';
import {fitTextWhenReady} from '@/client/utils/textFit';
import {groupScoresByTeam} from '@/client/utils/groupScoresByTeam';

type Refs = {
  name: HTMLElement | undefined;
};

export default defineComponent({
  name: 'Award',
  props: {
    award: {
      type: Object as () => FundedAwardModel,
      required: true,
    },
    showScores: {
      type: Boolean,
      default: true,
    },
    showDescription: {
      type: Boolean,
    },
    // Awards are funded/ranked at the team level in Conglomerates games (see
    // ConglomeratesExpansion.calculateVictoryPoints) -- appended to the description so it's
    // clear the ranking is combined, not per-player.
    conglomeratesExpansion: {
      type: Boolean,
      default: false,
    },
  },
  mounted() {
    this.fitName();
  },
  watch: {
    'award.name'() {
      this.fitName();
    },
  },
  methods: {
    playerSymbol(color: Color) {
      return playerSymbol(color);
    },
    // Size the name to fit its medal box by measuring the rendered text rather
    // than guessing from its length.
    fitName(): void {
      fitTextWhenReady(this.typedRefs.name, 'award-name');
    },
    playerCubeCss(color: Color | undefined): string {
      if (color === undefined) {
        return '';
      }
      let css = 'board-cube board-cube--' + color;
      if (isReservedPlayerColor(color)) {
        css += ' board-cube--persona';
      }
      return css;
    },
  },
  computed: {
    typedRefs(): Refs {
      return this.$refs as unknown as Refs;
    },
    nameCss(): string {
      return 'ma-name--' + this.award.name.replaceAll(' ', '-').replaceAll('.', '').toLowerCase();
    },
    sortedScores(): Array<AwardScore> {
      return groupScoresByTeam(this.award.scores, this.award.teamScores);
    },
    description(): string {
      const base = getAward(this.award.name).description;
      if (this.conglomeratesExpansion) {
        return `${base} between you and your teammate`;
      }
      return base;
    },
  },
});
</script>
