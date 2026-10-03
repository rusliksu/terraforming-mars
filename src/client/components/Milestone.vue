<template>
  <div class="ma-block">
    <div class="ma-player" v-if="milestone.playerName">
      <i :title="milestone.playerName" :class="playerCubeCss(milestone.color)"></i>
    </div>
    <div class="ma-name--milestones" :class="nameCss">
      <div v-if="conglomeratesNumberPatch !== undefined" class="ma-number-patch">{{ conglomeratesNumberPatch }}</div>
      <span ref="name" v-i18n>{{name}}</span>
      <div v-if="milestone.teamScores !== undefined" class="ma-team-scores">
        <span
          v-for="(team, idx) in milestone.teamScores"
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
            :class="getClass(score)"
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
import {ClaimedMilestoneModel, MilestoneScore} from '@/common/models/ClaimedMilestoneModel';
import {getMilestone} from '@/client/MilestoneAwardManifest';
import {CONGLOMERATES_MILESTONE_NUMBERS} from '@/common/ma/ConglomeratesMilestoneNumbers';
import {playerSymbol} from '@/client/utils/playerSymbol';
import {Color, isReservedPlayerColor} from '@/common/Color';
import {fitTextWhenReady} from '@/client/utils/textFit';
import {groupScoresByTeam} from '@/client/utils/groupScoresByTeam';

type Refs = {
  name: HTMLElement | undefined;
};

export default defineComponent({
  name: 'Milestone',
  props: {
    milestone: {
      type: Object as () => ClaimedMilestoneModel,
      required: true,
    },
    showScores: {
      type: Boolean,
      default: true,
    },
    showDescription: {
      type: Boolean,
    },
  },
  mounted() {
    this.fitName();
  },
  watch: {
    name() {
      this.fitName();
    },
  },
  methods: {
    // Size the name to fit its medal box by measuring the rendered text rather
    // than guessing from its length.
    fitName(): void {
      fitTextWhenReady(this.typedRefs.name, 'milestone-name');
    },
    playerSymbol(color: Color): string {
      return playerSymbol(color);
    },
    getClass(score: MilestoneScore): string {
      let classes = 'ma-score';
      classes += ` player_bg_color_${score.color}`;
      if (score.claimable) {
        classes += ' claimable';
      } else {
        classes += ' not-claimable';
      }
      return classes;
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
    name(): string {
      return this.milestone.name.replace(/[0-9]+$/, '');
    },
    nameCss(): string {
      return 'ma-name ma-name--' + this.milestone.name.replaceAll(' ', '-').replaceAll('.', '').toLowerCase();
    },
    sortedScores(): Array<MilestoneScore> {
      return groupScoresByTeam(this.milestone.scores, this.milestone.teamScores);
    },
    description(): string {
      return getMilestone(this.milestone.name).description;
    },
    conglomeratesNumberPatch(): number | undefined {
      return CONGLOMERATES_MILESTONE_NUMBERS[this.milestone.name];
    },
  },
});
</script>
