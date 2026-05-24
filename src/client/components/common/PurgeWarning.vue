<template>
  <span v-if="shouldShowWarning">
    <div :class="hoursLeft < 48 ? 'general-warning' : ''">
      <span v-if="isPastExpectedPurgeTime" v-i18n>Warning: This game is past its expected purge time and may be purged soon.</span>
      <span v-else>{{translateTextWithParams('Warning: This game will be purged in approximately ${0} hours.', [Math.floor(hoursLeft).toString()])}}</span>
      <span> </span>
      <a href="https://github.com/terraforming-mars/terraforming-mars/wiki/FAQ#purge" target="_blank">
        <span v-i18n>Why?</span>
      </a>
    </div>
  </span>
</template>
<script lang="ts">
import {translateTextWithParams} from '@/client/directives/i18n';
import {defineComponent} from 'vue';

export default defineComponent({
  name: 'PurgeWarning',
  props: {
    expectedPurgeTimeMs: {
      type: Number,
      required: true,
    },
  },
  computed: {
    shouldShowWarning(): boolean {
      return this.expectedPurgeTimeMs !== 0;
    },
    isPastExpectedPurgeTime(): boolean {
      return this.hoursLeft <= 0;
    },
    hoursLeft(): number {
      const nowMs = Date.now();
      const diffMs = this.expectedPurgeTimeMs - nowMs;
      const diffh = diffMs / 3_600_000;
      return diffh;
    },
    translateTextWithParams(): typeof translateTextWithParams {
      return translateTextWithParams;
    },
  },
});
</script>
