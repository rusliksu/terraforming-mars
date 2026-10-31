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
            <BoardCube v-if="award.color !== undefined" class="board-cube" :color="award.color" view="slight" :data-test-player-cube="award.color" />
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
          />
        </div>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalAwards from '@/client/components/Awards.vue';
import BoardCube from '@/client/wrybit/visuals/common/BoardCube.vue';
import Award from '@/client/wrybit/visuals/Award.vue';

// Canonical owner retains costs, claimability, team scores and descriptions.
export default defineComponent({
  name: 'WrybitAwards',
  extends: CanonicalAwards,
  components: {BoardCube, Award},
});
</script>
