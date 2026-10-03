<template>
    <div class="card-extra-content-container">
      <div v-if="lifeFound()" class="little-green-men" ></div>
      <div v-if="isMiningTileOnSteel()" class="mined-metal mined-steel" ></div>
      <div v-if="isMiningTileOnTitanium()" class="mined-metal mined-titanium" ></div>
      <div v-if="inSpireResources.length > 0" class="in-spire-resources">
        <span class="in-spire-resources-label">Stored:</span>
        <CardRenderItemComponent v-for="(item, index) in inSpireResources" :key="index" :item="item" />
      </div>
    </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {CardModel} from '@/common/models/CardModel';
import {CardName} from '@/common/cards/CardName';
import {Resource} from '@/common/Resource';
import CardRenderItemComponent from './CardRenderItemComponent.vue';

export default defineComponent({
  name: 'CardExtraContent',
  components: {
    CardRenderItemComponent,
  },
  props: {
    card: {
      type: Object as () => CardModel,
      required: true,
    },
  },
  computed: {
    inSpireResources() {
      return this.card.inSpireResources ?? [];
    },
  },
  methods: {
    isMiningTileOnSteel() {
      return this.card.name !== CardName.SPECIALIZED_SETTLEMENT && this.card.bonusResource?.includes(Resource.STEEL);
    },
    isMiningTileOnTitanium() {
      return this.card.name !== CardName.SPECIALIZED_SETTLEMENT && this.card.bonusResource?.includes(Resource.TITANIUM);
    },
    lifeFound() {
      return this.card.name === CardName.SEARCH_FOR_LIFE && this.card.resources !== undefined && this.card.resources > 0;
    },
  },
});

</script>

