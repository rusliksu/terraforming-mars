<template>
  <div v-show="isVisible()" class="spectator-hand-panel">
    <div :class="'player_translucent_bg_color_' + player.color" class="other_player_header">
      <div class="player_name">{{ player.name }} <span v-i18n>cards in hand</span></div>
      <AppButton size="big" type="close" @click="hideMe" :disableOnServerBusy="false" align="right" />
    </div>
    <div class="other_player_cont menu">
      <div class="player_home_block">
        <div class="sortable-cards">
          <div v-for="card in cardsInHand()" :key="card.name" class="cardbox">
            <Card :card="card"/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {CardModel} from '@/common/models/CardModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {vueRoot} from '@/client/components/vueRoot';
import AppButton from '@/client/components/common/AppButton.vue';
import Card from '@/client/components/card/Card.vue';
import {spectatorHandVisibilityKey} from './playerVisibilityKeys';

export default defineComponent({
  name: 'SpectatorHand',
  props: {
    player: {
      type: Object as () => PublicPlayerModel,
      required: true,
    },
    playerIndex: {
      type: Number,
      required: true,
    },
  },
  components: {
    AppButton,
    Card,
  },
  methods: {
    hideMe(): void {
      vueRoot(this).setVisibilityState(spectatorHandVisibilityKey(this.playerIndex), false);
    },
    isVisible(): boolean {
      return vueRoot(this).getVisibilityState(spectatorHandVisibilityKey(this.playerIndex));
    },
    cardsInHand(): ReadonlyArray<CardModel> {
      const cards = this.player.spectatorCards;
      if (cards === undefined) {
        return [];
      }
      return [
        ...cards.preludeCardsInHand,
        ...cards.ceoCardsInHand,
        ...cards.cardsInHand,
      ];
    },
  },
});
</script>
