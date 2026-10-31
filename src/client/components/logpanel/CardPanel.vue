<template>
  <div class="card-panel" v-if="message !== undefined && show">
    <AppButton size="big" type="close" :disableOnServerBusy="false" @click="hideMe" align="right" />
    <div id="log_panel_card" class="cardbox" v-for="name in cards" :key="name">
      <Card :card="logCardModel(name, players)" />
    </div>
    <div id="log_panel_card" class="cardbox" v-for="name in globalEvents" :key="name">
      <GlobalEvent :globalEventName="name" type="prior" :showIcons="false" />
    </div>
    <div id="log_panel_card" class="cardbox" v-for="name in colonies" :key="name">
      <Colony :colony="getColony(name)" />
    </div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {CardName} from '@/common/cards/CardName';
import {ColonyName} from '@/common/colonies/ColonyName';
import {ColonyModel, simpleColonyModel} from '@/common/models/ColonyModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import Card from '@/client/components/card/Card.vue';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import Colony from '@/client/components/colonies/Colony.vue';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import {logCardModel} from './logCardModel';

export default defineComponent({
  name: 'LogPanel',
  emits: ['hide'],
  props: {
    message: {
      type: Object as () => LogMessage,
      required: true,
    },
    players: {
      type: Array as () => Array<PublicPlayerModel>,
      required: true,
    },
  },
  components: {
    AppButton,
    Card,
    Colony,
    GlobalEvent,
  },
  computed: {
    show(): boolean {
      return this.cards.length + this.globalEvents.length + this.colonies.length > 0;
    },
    cards(): ReadonlyArray<CardName> {
      return this.message.data
        .filter((datum) => datum.type === LogMessageDataType.CARD || datum.type === LogMessageDataType.CARDS)
        .flatMap((datum) => datum.type === LogMessageDataType.CARD ? [datum.value] : datum.value);
    },
    globalEvents(): Array<GlobalEventName> {
      return this.message.data.filter((datum) => datum.type === LogMessageDataType.GLOBAL_EVENT).map((datum) => datum.value);
    },
    colonies(): Array<ColonyName> {
      return this.message.data.filter((datum) => datum.type === LogMessageDataType.COLONY).map((datum) => datum.value);
    },
  },
  methods: {
    logCardModel,
    hideMe() {
      this.$emit('hide');
    },
    getColony(name: ColonyName): ColonyModel {
      return simpleColonyModel(name);
    },
  },
});

</script>
