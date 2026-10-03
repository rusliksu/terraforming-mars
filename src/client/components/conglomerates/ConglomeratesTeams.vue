<template>
    <div class="conglomerates-teams" v-if="model.teams.length > 0">
        <div class="ma-title">
            <a class="ma-clickable" href="#" @click.prevent="toggle()" v-i18n>Team Scores</a>
        </div>
        <div v-show="expanded" class="conglomerates-teams-list">
            <div v-for="team in model.teams" :key="team.id" class="conglomerates-team">
                <div class="conglomerates-team-header">
                    <span
                      v-for="color in team.playerColors"
                      :key="color"
                      class="conglomerates-team-swatch"
                      :class="playerColorClass(color, 'bg')"
                    ></span>
                    <span class="conglomerates-team-name">{{ team.name }}</span>
                </div>
                <div class="conglomerates-team-total" :class="teamColorClass(team)">
                    <div class="conglomerates-team-total-icon">★</div>
                    <div class="conglomerates-team-total-score">{{ team.victoryPoints.total }}</div>
                </div>
                <div class="conglomerates-team-members">
                    <span
                      v-for="(score, idx) in team.memberScores"
                      :key="idx"
                      class="conglomerates-team-member-score"
                    >
                      <span class="conglomerates-team-swatch" :class="playerColorClass(team.playerColors[idx], 'bg')"></span>({{ score }})
                    </span>
                </div>
                <div class="conglomerates-team-breakdown">
                    <div class="conglomerates-team-row">
                        <span v-i18n>Players</span>
                        <span>{{ team.victoryPoints.players }}</span>
                    </div>
                    <div class="conglomerates-team-row">
                        <span v-i18n>Milestones</span>
                        <span>{{ team.victoryPoints.milestones }}</span>
                    </div>
                    <div class="conglomerates-team-row">
                        <span v-i18n>Awards</span>
                        <span>{{ team.victoryPoints.awards }}</span>
                    </div>
                    <div class="conglomerates-team-row">
                        <span v-i18n>Bonuses</span>
                        <span>{{ team.victoryPoints.bonuses }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {ConglomeratesModel, ConglomeratesTeamModel} from '@/common/models/ConglomeratesModel';
import {playerColorClass} from '@/common/utils/utils';

export default defineComponent({
  name: 'ConglomeratesTeams',
  props: {
    model: {
      type: Object as () => ConglomeratesModel,
      required: true,
    },
  },
  data() {
    return {
      expanded: true,
    };
  },
  methods: {
    playerColorClass,
    toggle() {
      this.expanded = !this.expanded;
    },
    // The team's shared Turmoil delegate color, matching the resource bar's own team outline
    // (PlayerResources.vue) so the same color means "this team" everywhere in the UI.
    teamColorClass(team: ConglomeratesTeamModel): string {
      return team.teamColor !== undefined ? `conglomerates-team-total--${team.teamColor}` : '';
    },
  },
});
</script>
