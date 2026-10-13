<template>
  <div class="card-container filterDiv hover-hide-res wrybit-card" :class="cardClasses">
      <!-- Action used this generation: the player's cube lies on the card like at the table, seen from above,
           at a random angle per card -->
      <span v-if="showPlayerCube" class="card-player-cube"><PlayerCube :color="cubeColor" view="top" :size="22" :spin="cubeSpin"/></span>
      <div class="card-content-wrapper" v-i18n @mouseover="hovering = true" @mouseleave="hovering = false">
          <div v-if="!isStandardProject" class="card-cost-and-tags">
              <CardCost :amount="cost" :newCost="reducedCost" :titanium="isInfrastructure" />
              <CardHelp v-if="hasHelpText" :name="card.name" :hovering="hovering" />
              <CardTags :tags="tags" />
          </div>
          <CardTitle :title="card.name" :type="cardType" :displayTitle="card.combinedDisplayName ?? cardMetadata.displayName" :tags="tags"/>
          <CardContent
              :metadata="cardMetadata"
              :requirements="cardRequirements"
              :isCorporation="isCorporationCard"
              :bottomPadding="bottomPadding" />
      </div>
      <CardExpansion :expansion="cardExpansion" :isCorporation="isCorporationCard" :isResourceCard="isResourceCard" :compatibility="cardCompatibility" />
      <CardResourceCounter v-if="hasResourceType" :amount="resourceAmount" :type="resourceType" />
      <CardVictoryPoints v-if="cardMetadata.victoryPoints !== undefined" :victoryPoints="cardMetadata.victoryPoints" />
      <CardExtraContent :card="card" />
      <slot></slot>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalCard from '@/client/components/card/Card.vue';
import CardTitle from '@/client/wrybit/visuals/card/CardTitle.vue';
import CardCost from '@/client/wrybit/visuals/card/CardCost.vue';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';

// Our card component remains the owner of card identity, metadata and server-provided prices.
export default defineComponent({
  name: 'WrybitCard',
  extends: CanonicalCard,
  components: {CardTitle, CardCost, PlayerCube},
  data() {
    return {cubeSpin: Math.round(Math.random() * 360)};
  },
  computed: {
    showPlayerCube(): boolean {
      return this.actionUsed && !this.card.isDisabled && this.cubeColor !== 'neutral';
    },
  },
});
</script>

<style lang="less" src="../../../../styles/wrybit/visuals.less"></style>
