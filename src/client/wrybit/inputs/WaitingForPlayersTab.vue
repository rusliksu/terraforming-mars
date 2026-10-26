<template>
  <div v-if="players.length > 0" class="or-tab or-tab--status" role="status">
    <span aria-hidden="true">⌛</span>
    <span v-if="parallel" v-i18n>Waiting for other players</span>
    <span v-for="player in players" :key="player.color" class="log-player" :class="'player_bg_color_' + player.color">{{ player.name }}</span>
    <span v-if="!parallel">{{ $t(players.length === 1 ? 'is taking their turn' : 'are taking their turn') }}</span>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import type {ViewModel} from '@/common/models/PlayerModel';
import {Phase} from '@/common/Phase';

const props = defineProps<{playerView: ViewModel}>();
const parallelPhases: ReadonlyArray<Phase> = [Phase.DRAFTING, Phase.INITIALDRAFTING, Phase.RESEARCH];
const parallel = computed(() => parallelPhases.includes(props.playerView.game.phase));
// The same public actor flags used by our canonical PlayersOverview status.
const players = computed(() => props.playerView.players.filter((player) => player.color !== props.playerView.thisPlayer?.color &&
  (props.playerView.game.phase === Phase.DRAFTING ? player.needsToDraft === true :
    props.playerView.game.phase === Phase.RESEARCH ? player.needsToResearch === true : player.isActive)));
</script>
