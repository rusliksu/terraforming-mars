<template>
  <!-- Content of the players screen: toggle, player table, milestones & awards (player and spectator) -->
  <div v-if="viewModel.players.length > 1" class="mb-segments" role="tablist">
    <button v-for="entry in PLAYER_SEGMENTS" :key="entry.key" type="button" role="tab"
      :aria-selected="segment === entry.key"
      :class="['mb-segment', {'mb-segment--active': segment === entry.key}]"
      @click="emit('update:segment', entry.key)">{{ entry.labels.map((label) => $t(label)).join(' & ') }}</button>
  </div>
  <PlayersOverview v-show="segment === 'players'" :playerView="viewModel" v-trim-whitespace/>
  <!-- Mount only when visible: the orientation watcher must measure the real mobile width. -->
  <div v-if="viewModel.players.length > 1 && segment === 'ma'" class="mb-ma">
    <MilestoneAwardTable :milestones="viewModel.game.milestones" :awards="viewModel.game.awards" :players="viewModel.players" :viewerColor="viewerColor" :scrollable="true">
      <!-- Same header as in the player section: name, status/time, corporation -->
      <template #player="{player}">
        <PlayerIdentity :player="player" :playerView="viewModel" :actionLabel="nativeActionLabel(player)" :highlighted="player.color === viewerColor"/>
      </template>
    </MilestoneAwardTable>
  </div>
</template>

<script setup lang="ts">
import {Color} from '@/common/Color';
import {ViewModel} from '@/common/models/PlayerModel';
import type {ActionLabel} from '@/client/components/overview/ActionLabel';
import PlayersOverview from '@/client/wrybit/visuals/overview/PlayersOverview.vue';
import PlayerIdentity from '@/client/wrybit/visuals/overview/PlayerIdentity.vue';
import MilestoneAwardTable from '@/client/wrybit/visuals/milestoneAwardTable/MilestoneAwardTable.vue';
import CanonicalPlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import type {PublicPlayerModel} from '@/common/models/PlayerModel';
import {PLAYER_SEGMENTS, PlayersSegment} from '@/client/wrybit/mobile/mobileScreens';

const props = defineProps<{
  viewModel: ViewModel;
  segment: PlayersSegment;
  // Color of your own player (highlighted); spectators have none
  viewerColor?: Color;
}>();

const emit = defineEmits<{
  (e: 'update:segment', segment: PlayersSegment): void;
}>();
// The canonical overview owns the phase/pass/next logic; keep calling it instead of duplicating
// the state machine here. defineComponent types `methods` as optional, hence the narrow cast.
type NativeActionLabel = (this: {playerView: ViewModel, players: ReadonlyArray<PublicPlayerModel>}, player: PublicPlayerModel) => ActionLabel;
const overviewMethods = CanonicalPlayersOverview.methods as unknown as {
  getActionLabel: NativeActionLabel;
};
function nativeActionLabel(player: PublicPlayerModel): ActionLabel {
  return overviewMethods.getActionLabel.call({playerView: props.viewModel, players: props.viewModel.players}, player);
}
</script>
