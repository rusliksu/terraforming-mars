<template>
    <div class="top-bar-container">
      <div class="top-bar">
        <PlayerInfo :player="playerView.thisPlayer" :playerView="playerView" :actionLabel="''" :playerIndex="0" :hideZeroTags="true" :isTopBar="true"/>
      </div>
    </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import PlayerInfo from '@/client/components/overview/PlayerInfo.vue';

export default defineComponent({
  name: 'TopBar',
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
