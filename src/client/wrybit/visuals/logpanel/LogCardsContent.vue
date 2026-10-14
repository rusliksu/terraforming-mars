<template>
  <div class="cardbox" v-for="name in logMessageCards(message)" :key="name">
    <Card :card="logCardModel(name, players)"/>
  </div>
  <div class="cardbox" v-for="name in logMessageGlobalEvents(message)" :key="name">
    <GlobalEvent :globalEventName="name" type="prior" :showIcons="false"/>
  </div>
  <div class="cardbox" v-for="name in logMessageColonies(message)" :key="name">
    <Colony :colony="simpleColonyModel(name)"/>
  </div>
</template>
<script setup lang="ts">
import {LogMessage} from '@/common/logs/LogMessage';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {simpleColonyModel} from '@/common/models/ColonyModel';
import {logCardModel} from '@/client/components/logpanel/logCardModel';
import {logMessageCards, logMessageColonies, logMessageGlobalEvents} from './logMessageContent';
import Card from '@/client/wrybit/visuals/card/Card.vue';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import Colony from '@/client/components/colonies/Colony.vue';
defineProps<{message: LogMessage; players: ReadonlyArray<PublicPlayerModel>}>();
</script>
