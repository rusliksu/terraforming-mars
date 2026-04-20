<template>
    <div class="top-bar">
      <PlayerInfo :player="playerView.thisPlayer" :playerView="playerView" :actionLabel="''" :playerIndex="0" :hideZeroTags="true" :isTopBar="true"/>
    </div>
</template>

<script lang="ts">

import {defineComponent} from '@/client/vue3-compat';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import PlayerInfo from '@/client/components/overview/PlayerInfo.vue';

export default defineComponent({
  name: 'top-bar',
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
  },
  components: {
    PlayerInfo,
  },
});
</script>
