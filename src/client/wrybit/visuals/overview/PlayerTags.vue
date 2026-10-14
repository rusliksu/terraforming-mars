<template>
    <div class="player-tags">
        <div class="player-tags-main">
            <TagCount tag="vp" :count="hideVpCount ? '?' : player.victoryPointsBreakdown.total" :size="'big'" :type="'main'" />
            <div v-if="isEscapeVelocityOn" :class="tooltipCss" :data-tooltip="$t('Escape Velocity penalty')">
              <TagCount tag="escape" :count="escapeVelocityPenalty" :size="'big'" :type="'main'" :showWhenZero="true"/>
            </div>
            <TagCount tag="tr" :count="player.terraformRating" :size="'big'" :type="'main'"/>
            <TagCount v-if="player.handicap !== undefined" :tag="'handicap'" :count="player.handicap" :size="'big'" :type="'main'" :showWhenZero="true"/>
            <div class="tag-and-discount">
              <HandDiscount v-if="all.discount || tagDetails.conditionalDiscounts.length > 0" :amount="all.discount" :conditional="tagDetails.conditionalDiscounts" :data-test="'discount-all'"/>
              <TagCount tag="cards" :count="cardsInHandCount" :size="'big'" :type="'main'"/>
            </div>
        </div>
        <div class="player-tags-secondary">
          <div class="tag-count-container" v-for="tagDetail of tags" :key="tagDetail.name">
            <template v-if="tagDetail.name === SpecialTags.UNDERGROUND_TOKEN_COUNT">
              <div class="tag-and-discount">
              <TagCount :tag="tagDetail.name" :undergroundToken="player.underworldData.activeBonus" :count="tagDetail.count" :size="'big'" :type="'secondary'"/>
              </div>
            </template>
            <div v-else-if="tagDetail.name === 'separator'" class="tag-separator"></div>
            <template v-else-if="tagDetail.name === 'all'"></template>
            <div v-else class="tag-and-discount">
              <PlayerTagDiscount v-if="tagDetail.discount > 0" :color="player.color" :amount="tagDetail.discount" :data-test="'discount-' + tagDetail.name"/>
              <PointsPerTag :points="tagDetail"/>
              <PlayerTagSubstitution v-if="tagDetail.substitution !== undefined" :tag="tagDetail.substitution" :data-test="'substitution-' + tagDetail.name"/>
              <TagCount :tag="tagDetail.name" :count="tagDetail.count" :size="'big'" :type="'secondary'"/>
            </div>
          </div>
        </div>
    </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalPlayerTags from '@/client/components/overview/PlayerTags.vue';
import HandDiscount from '@/client/wrybit/visuals/overview/HandDiscount.vue';
import {buildTagDetails, TagDetails} from '@/client/wrybit/visuals/overview/playerTagDetails';

export default defineComponent({
  name: 'PlayerTags',
  extends: CanonicalPlayerTags,
  components: {HandDiscount},
  computed: {
    tagDetails(): TagDetails {
      return buildTagDetails(this.player, this.playerView);
    },
  },
});
</script>
