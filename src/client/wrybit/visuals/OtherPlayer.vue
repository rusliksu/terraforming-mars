<template>
  <div v-show="isVisible()" class="other_player_panel">
    <div :class="'player_translucent_bg_color_' + player.color" class="other_player_header">
      <div class="player_name">{{ player.name }} <span v-i18n>played cards</span></div>
      <AppButton size="big" type="close" @click="hideMe" :disableOnServerBusy="false" align="right" />
    </div>
    <div class="other_player_cont menu">
        <div v-if="player.tableau.length > 0" class="player_home_block">
          <PlayedCardsGroups :player="player"/>
        </div>
        <div v-if="player.selfReplicatingRobotsCards.length > 0" class="player_home_block">
            <span v-i18n>Self-replicating Robots cards</span>
            <div>
                <div v-for="card in player.selfReplicatingRobotsCards" :key="card.name" class="cardbox">
                    <Card :card="card" />
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalOtherPlayer from '@/client/components/OtherPlayer.vue';
import Card from '@/client/wrybit/visuals/card/Card.vue';
import PlayedCardsGroups from '@/client/wrybit/visuals/PlayedCardsGroups.vue';

export default defineComponent({
  name: 'OtherPlayer',
  extends: CanonicalOtherPlayer,
  components: {Card, PlayedCardsGroups},
});
</script>
