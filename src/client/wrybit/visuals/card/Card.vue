<template>
  <div class="card-container filterDiv hover-hide-res wrybit-card" :class="[cardClasses, {'card-life-found': lifeFound}]">
    <!-- Action used this generation: the player's cube lies on the card like at the table, seen from above,
           at a random angle per card -->
    <span v-if="showPlayerCube" class="card-player-cube"><PlayerCube :color="cubeColor" view="top" :size="22" :spin="cubeSpin" /></span>
    <div class="card-content-wrapper" v-i18n @mouseover="hovering = true" @mouseleave="hovering = false">
      <div v-if="!isStandardProject" class="card-cost-and-tags">
        <CardCost :amount="cost" :newCost="reducedCost" :titanium="isInfrastructure" />
        <CardHelp v-if="hasHelpText" :name="card.name" :hovering="hovering" />
        <CardTags :tags="tags" />
      </div>
      <CardTitle :title="card.name" :type="cardType" :displayTitle="card.combinedDisplayName ?? cardMetadata.displayName" :tags="tags" />
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
import CardHelp from './CardHelp.vue';
import CardContent from './CardContent.vue';
import CardExtraContent from './CardExtraContent.vue';
import {hasFoundLife} from '@/client/cards/CardModelMetadata';
import {CARD_HELP_TEXT} from '@/client/cards/CardHelpText';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';

// Our card component remains the owner of card identity, metadata and server-provided prices.
export default defineComponent({
  name: 'WrybitCard',
  extends: CanonicalCard,
  components: {CardTitle, CardCost, CardHelp, CardContent, CardExtraContent, PlayerCube},
  data() {
    return {cubeSpin: Math.round(Math.random() * 360)};
  },
  computed: {
    hasHelpText(): boolean {
      return this.helpText !== undefined || CARD_HELP_TEXT[this.card.name] !== undefined;
    },
    lifeFound(): boolean {
      return hasFoundLife(this.card);
    },
    showPlayerCube(): boolean {
      return this.actionUsed && !this.card.isDisabled && this.cubeColor !== 'neutral';
    },
  },
});
</script>

<style lang="less" src="../../../../styles/wrybit/visuals.less"></style>
