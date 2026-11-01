<template>
  <div class="awards_cont">
    <div class="awards">
      <div class="ma-title">
        <a @click.prevent="toggleList" class="ma-clickable awards-padding" href="#" data-test="toggle-awards" v-i18n>Awards</a>
        <span
          v-for="award in fundedAwards"
          :key="award.name"
          :title="award.playerName"
          class="milestone-award-inline paid"
          data-test="funded-awards"
        >
          <span v-i18n>{{ award.name }}</span>
          <span class="ma-player-cube">
            <i
              :class="playerCubeCss(award.color)"
              :data-test-player-cube="award.color"
            ></i>
          </span>
        </span>

        <span v-if="isLearnerModeOn">
          <span
            v-for="spotPrice in availableAwardSpots"
            :key="spotPrice"
            class="milestone-award-inline unpaid"
          >
            <div class="milestone-award-price-row">
              <div class="milestone-award-price" data-test="spot-price" v-text="spotPrice"></div>
              <template v-if="conglomeratesExpansion">
                <div class="milestone-award-arrow" :title="$t('You also gain 1 Coordination')"></div>
                <div class="milestone-award-coordination" data-test="award-coordination-icon" :title="$t('You also gain 1 Coordination')"></div>
              </template>
            </div>
          </span>
        </span>
      </div>

      <span @click="toggleDescription" :title="$t('press to show or hide the description')" data-test="toggle-description">
        <div v-show="showAwardDetails">
          <Award
            v-for="award in awards"
            :key="award.name"
            :award="award"
            :showScores="showScores"
            :showDescription="showDescription"
            :conglomeratesExpansion="conglomeratesExpansion"
            :closed="awardClosed(award)"
          />
        </div>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import Award from '@/client/components/Award.vue';
import {AWARD_COSTS} from '@/common/constants';
import {availableAwardPrices} from '@/client/components/milestoneAwardPrices';
import {FundedAwardModel} from '@/common/models/FundedAwardModel';
import {Preferences, PreferencesManager} from '@/client/utils/PreferencesManager';
import {Color, isReservedPlayerColor} from '@/common/Color';

export default defineComponent({
  name: 'Awards',
  components: {Award},
  props: {
    awards: {
      type: Array as () => ReadonlyArray<FundedAwardModel>,
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
    // Conglomerates raises the funding cost's base from 8 to 12 -- see Game.getAwardFundingCost().
    conglomeratesExpansion: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    const fundedAwardCount = this.awards.filter((award) => award.playerName).length;
    const hasAvailableAwards = fundedAwardCount < AWARD_COSTS.length;
    return {
      // Funded awards still need to stay visible because their scores keep changing.
      showAwardDetails: true,
      showDescription: hasAvailableAwards,
    };
  },
  methods: {
    // No spots left: the award can no longer be funded.
    awardClosed(award: FundedAwardModel): boolean {
      return award.playerName === undefined && this.fundedAwards.length >= AWARD_COSTS.length;
    },
    toggleList() {
      this.showAwardDetails = !this.showAwardDetails;
    },
    toggleDescription() {
      this.showDescription = !this.showDescription;
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
    fundedAwards(): FundedAwardModel[] {
      const isFunded = (award: FundedAwardModel) => !!award.playerName;
      return this.awards.filter(isFunded);
    },
    availableAwardSpots(): number[] {
      return availableAwardPrices(this.fundedAwards.length, this.conglomeratesExpansion);
    },
    isLearnerModeOn(): boolean {
      return this.preferences.learner_mode;
    },
  },
});
</script>
