<template>
    <div
      class="terraformed-banner"
      :class="{'terraformed-banner--animated': animate}"
      :title="$t('Mars is Terraformed!')"
      :aria-label="$t('Mars is Terraformed!')"
      role="status">
      <span aria-hidden="true">MARS</span>
      <span class="terraformed-banner__check" aria-hidden="true">✓</span>
    </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {PlayerId} from '@/common/Types';
import {consumeFirstBannerShow} from '@/client/utils/terraformedBannerStorage';

export default defineComponent({
  name: 'TerraformedBanner',
  props: {
    playerId: {
      type: String as () => PlayerId,
      required: true,
    },
  },
  data() {
    return {
      animate: false,
    };
  },
  created() {
    this.animate = consumeFirstBannerShow(this.playerId);
  },
});
</script>
