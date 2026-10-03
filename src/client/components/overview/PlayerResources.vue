<template>
  <div class="resource_items_cont" :class="teamColorClass">
    <PlayerResource
      :type="Resource.MEGACREDITS"
      :count="player.megacredits"
      :production="player.megacreditProduction"
      :resourceProtection="player.protectedResources.megacredits"
      :productionProtection="player.protectedProduction.megacredits"/>
    <PlayerResource
      :type="Resource.STEEL"
      :count="player.steel"
      :production="player.steelProduction"
      :value="player.steelValue"
      :resourceProtection="player.protectedResources.steel"
      :productionProtection="player.protectedProduction.steel"/>
    <!-- TODO LUNA TRADE FEDERATION -->
    <PlayerResource
      :type="Resource.TITANIUM"
      :count="player.titanium"
      :production="player.titaniumProduction"
      :value="player.titaniumValue"
      :resourceProtection="player.protectedResources.titanium"
      :productionProtection="player.protectedProduction.titanium"/>
    <PlayerResource
      :type="Resource.PLANTS"
      :count="player.plants"
      :production="player.plantProduction"
      :resourceProtection="player.protectedResources.plants"
      :productionProtection="player.protectedProduction.plants"/>
    <PlayerResource
      :type="Resource.ENERGY"
      :count="player.energy"
      :production="player.energyProduction"
      :resourceProtection="player.protectedResources.energy"
      :productionProtection="player.protectedProduction.energy"/>
    <PlayerResource
      :type="Resource.HEAT"
      :count="player.heat"
      :production="player.heatProduction"
      :value="canUseHeatAsMegaCredits ? 1 : 0"
      :resourceProtection="player.protectedResources.heat"
      :productionProtection="player.protectedProduction.heat"/>
    <div v-if="conglomeratesExpansion" class="resource_item resource_item--coordination" data-test="coordination-resource">
      <div class="resource_item_stock">
        <i class="resource_icon resource_icon--coordination tooltip tooltip-bottom" :data-tooltip="$t('Coordination')">
          <span class="resource_icon--coordination-fill"></span>
        </i>
        <div class="resource_item_stock_count" data-test="stock-count">{{ player.conglomeratesData.coordination }}</div>
      </div>
      <div class="resource_item_prod">
        <span class="resource_item_prod_count tooltip tooltip-bottom" data-test="production" :data-tooltip="$t('Every player gains 2 Coordination each generation')">+2</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {CardName} from '@/common/cards/CardName';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import PlayerResource from '@/client/components/overview/PlayerResource.vue';
import {Resource} from '@/common/Resource';

export default defineComponent({
  name: 'PlayerResources',
  props: {
    player: {
      type: Object as () => PublicPlayerModel,
      required: true,
    },
    conglomeratesExpansion: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    Resource(): typeof Resource {
      return Resource;
    },
    // TODO LUNA TRADE FEDERATION
    canUseHeatAsMegaCredits(): boolean {
      return this.player.tableau.some((card) => card.name === CardName.HELION);
    },
    teamColorClass(): string {
      const color = this.player.conglomeratesTeamColor;
      return color !== undefined ? `resource_items_cont--team_${color}` : '';
    },
  },
  components: {
    PlayerResource,
  },
});
</script>
