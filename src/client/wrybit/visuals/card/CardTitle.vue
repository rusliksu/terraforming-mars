<template>
  <div :class="[getMainClasses(), {'is-corporation': isCorporation()}]">
    <div v-if="isPrelude()" class="prelude-label" v-i18n>prelude</div>
    <div v-if="isCorporation()" class="corporation-label" v-i18n>corporation</div>
    <div v-if="isCeo()" class="ceo-label">CEO</div>
    <CardCorporationLogo v-if="isCorporation()" :title="title"/>
    <div v-else ref="title" class="card-title" :class="getClasses()">{{ displayTitleWithoutSuffix }}</div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalCardTitle from '@/client/components/card/CardTitle.vue';

export default defineComponent({name: 'CardTitle', extends: CanonicalCardTitle});
</script>
