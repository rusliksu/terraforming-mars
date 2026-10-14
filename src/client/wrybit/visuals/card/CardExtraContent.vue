<template>
  <div class="card-extra-content-container">
    <div v-if="lifeFound()" class="found-life">
      <img class="found-life__microbe" src="assets/martian.png" alt="">
      <p class="found-life__hint">
        <span v-i18n>Life found.</span><span class="found-life__check" aria-hidden="true">✔</span><br>
        <span class="found-life__warning" v-i18n>No further VP possible!</span>
      </p>
    </div>
    <div v-if="isMiningTileOnSteel()" class="mined-metal mined-steel"></div>
    <div v-if="isMiningTileOnTitanium()" class="mined-metal mined-titanium"></div>
    <div v-if="inSpireResources.length > 0" class="in-spire-resources">
      <span class="in-spire-resources-label">Stored:</span>
      <CardRenderItemComponent v-for="(item, index) in inSpireResources" :key="index" :item="item"/>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalExtraContent from '@/client/components/card/CardExtraContent.vue';

export default defineComponent({name: 'CardExtraContent', extends: CanonicalExtraContent});
</script>
