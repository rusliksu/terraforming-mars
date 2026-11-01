<template>
  <div class="milestones_cont">
    <div class="milestones">
      <div class="ma-title">
        <a class="ma-clickable" href="#" @click.prevent="toggleList()" v-i18n>Milestones</a>
        <span v-for="milestone in milestones.filter((m) => m.playerName)" :key="milestone.name" class="milestone-award-inline paid" :title="milestone.playerName">
          <span v-i18n>{{ milestone.name }}</span>
          <span class="ma-player-cube"><i :class="playerCubeCss(milestone.color)"></i></span>
        </span>
        <span v-if="isLearnerModeOn()">
          <span v-for="(spotPrice, index) in availableMilestoneSpots" :key="index" class="milestone-award-inline unpaid">
            <div class="milestone-award-price-row">
              <div class="milestone-award-price">{{ spotPrice }}</div>
              <template v-if="conglomeratesExpansion">
                <div class="milestone-award-arrow" :title="$t('You also gain 1 Coordination')"></div>
                <div class="milestone-award-coordination" :title="$t('You also gain 1 Coordination')"></div>
              </template>
            </div>
          </span>
        </span>
      </div>
      <span @click="toggleDescription" :title="$t('press to show or hide the description')" data-test="toggle-description">
        <div v-show="showMilestoneDetails">
          <Milestone
            v-for="milestone in milestones"
            :key="milestone.name"
            :milestone="milestone"
            :showScores="showScores"
            :showDescription="showDescription"
          />
        </div>
      </span>
    </div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {MAX_MILESTONES} from '@/common/constants';
import {availableMilestonePrices} from '@/client/components/milestoneAwardPrices';
import Milestone from '@/client/components/Milestone.vue';
import {ClaimedMilestoneModel} from '@/common/models/ClaimedMilestoneModel';
import {Preferences, PreferencesManager} from '@/client/utils/PreferencesManager';
import {Color, isReservedPlayerColor} from '@/common/Color';

export default defineComponent({
  name: 'Milestones',
  props: {
    milestones: {
      type: Array as () => ReadonlyArray<ClaimedMilestoneModel>,
      required: true,
    },
    showScores: {
      type: Boolean,
      default: true,
    },
    preferences: {
      type: Object as () => Readonly<Preferences>,
      default: () => PreferencesManager.INSTANCE.values(),
    },
    // Conglomerates scales the claim cost 1.5x (rounded up) -- see Player.milestoneCost().
    conglomeratesExpansion: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    const claimedMilestoneCount = this.milestones.filter((milestone) => milestone.playerName).length;
    const hasAvailableMilestones = claimedMilestoneCount < MAX_MILESTONES;
    return {
      showMilestoneDetails: hasAvailableMilestones,
      showDescription: hasAvailableMilestones,
    };
  },
  components: {
    Milestone,
  },
  computed: {
    availableMilestoneSpots(): Array<number> {
      const count = this.milestones.filter((milestone) => milestone.playerName).length;
      return availableMilestonePrices(count, this.conglomeratesExpansion);
    },
  },
  methods: {
    toggleDescription() {
      this.showDescription = !this.showDescription;
    },
    toggleList() {
      this.showMilestoneDetails = !this.showMilestoneDetails;
    },
    isLearnerModeOn(): boolean {
      return this.preferences.learner_mode;
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
});
</script>
