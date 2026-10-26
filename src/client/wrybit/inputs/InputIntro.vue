<template>
  <TabIntroBlock v-if="input.type === 'space' && input.tileType !== undefined" :tileType="input.tileType" :title="caption" :facts="facts" :finale="finale"/>
  <CardIntroBlock v-else-if="sourceCard !== undefined" :card="sourceCard" :title="caption"/>
  <label v-else-if="!draftRepick" :class="belowHeader ? 'or-tab-panel-caption' : 'or-tab-panel-title'"><div>{{ $t(caption) }}</div></label>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {PlayerInputModel} from '@/common/models/PlayerInputModel';
import type {PlayerViewModel} from '@/common/models/PlayerModel';
import type {Message} from '@/common/logs/Message';
import {TileType} from '@/common/TileType';
import {DEFAULT_GLOBAL_PARAMETERS} from '@/common/GlobalParameterConfig';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {inputSourceCard} from './inputSourceCard';
import {fullTabTitle} from './orOptionsShortLabels';
import CardIntroBlock from './CardIntroBlock.vue';
import TabIntroBlock from './TabIntroBlock.vue';

const props = defineProps<{input: PlayerInputModel, playerView: PlayerViewModel, title?: string | Message, draftRepick?: boolean, belowHeader?: boolean}>();
const caption = computed(() => fullTabTitle(props.title ?? props.input.title));
const sourceCard = computed(() => inputSourceCard(props.input));
const finale = computed(() => props.input.type === 'space' && props.input.finalGreenery === true ?
  props.playerView.game.isTerraformed ? 'terraformed' : 'final-greenery' : undefined);
const facts = computed((): Array<string | Message> => {
  if (props.input.type !== 'space') {
    return [];
  }
  const raw = (...values: Array<number>): Message['data'] => values.map((value) => ({type: LogMessageDataType.RAW_STRING, value: String(value)}));
  if (props.input.tileType === TileType.OCEAN) {
    const max = (props.playerView.game.gameOptions.globalParameters ?? DEFAULT_GLOBAL_PARAMETERS).oceans.max;
    return [{message: '${0} of ${1} oceans are already on Mars', data: raw(props.playerView.game.oceans, max)}];
  }
  if (props.input.tileType === TileType.GREENERY) {
    return [{message: 'You have ${0} plants', data: raw(props.playerView.thisPlayer.plants)}];
  }
  return [];
});
</script>
