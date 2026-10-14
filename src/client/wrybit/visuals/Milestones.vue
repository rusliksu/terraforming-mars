<template>
    <div class="milestones_cont" v-trim-whitespace>
        <div class="milestones">
            <div class="ma-title">
                <a class="ma-clickable" href="#" @click.prevent="toggleList()" v-i18n>Milestones</a>
                <span v-for="milestone in milestones.filter((m) => m.playerName)" :key="milestone.name" class="milestone-award-inline paid" :title="milestone.playerName">
                    <span v-i18n>{{ milestone.name }}</span>
                    <span class="ma-player-cube"><BoardCube v-if="milestone.color !== undefined" class="board-cube" :color="milestone.color" view="slight"/></span>
                </span>
                <span v-if="isLearnerModeOn()">
                    <span v-for="(spotPrice, index) in getAvailableMilestoneSpots()" :key="index" class="milestone-award-inline unpaid">
                        <div class="milestone-award-price-row">
                          <div class="milestone-award-price">{{spotPrice}}</div>
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
import CanonicalMilestones from '@/client/components/Milestones.vue';
import BoardCube from '@/client/wrybit/visuals/common/BoardCube.vue';
import Milestone from '@/client/wrybit/visuals/Milestone.vue';

// Canonical owner retains costs, claimability, team scores and descriptions.
export default defineComponent({
  name: 'WrybitMilestones',
  extends: CanonicalMilestones,
  components: {BoardCube, Milestone},
});
</script>
