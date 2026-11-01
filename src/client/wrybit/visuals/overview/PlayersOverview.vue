<template>
  <div class="players-overview" v-if="hasPlayers"><OverviewSettings />
    <!-- Played cards of all players, including your own (via "show" in the player bar) -->
    <div class="other_player">
      <div v-for="(otherPlayer, index) in playersInOrder" :key="otherPlayer.color">
        <OtherPlayer :player="otherPlayer" :playerIndex="index" />
      </div>
      <div v-if="thisPlayer !== undefined">
        <OtherPlayer :player="thisPlayer" :playerIndex="ownPlayerIndex(playerView)" />
      </div>
    </div>
    <PlayerInfo v-for="(p, index) in playersInOrder"
      :player="p"
      :key="p.color"
      :readOnly="readOnly" :playerView="playerView"
      :firstForGen="getIsFirstForGen(p)"
      :actionLabel="getActionLabel(p)" :eloDelta="getEloDelta(p)"
      :playerIndex="index" />
    <PlayerInfo
      v-if="thisPlayer !== undefined"
      :player="thisPlayer"
      :key="thisPlayer.color"
      :readOnly="readOnly" :playerView="playerView"
      :firstForGen="getIsFirstForGen(thisPlayer)"
      :actionLabel="getActionLabel(thisPlayer)" :eloDelta="getEloDelta(thisPlayer)"
      :playerIndex="ownPlayerIndex(playerView)" />
    <!-- The same players as a table; visible only in the two-column layout (players_table.less).
                 In the wide player view it is teleported above the columns so it can use the full page width. -->
    <Teleport v-if="tableTarget !== undefined" defer :to="tableTarget">
      <PlayersTable :readOnly="readOnly" :playerView="playerView" :rows="tableRows" />
    </Teleport>
    <PlayersTable v-else :readOnly="readOnly" :playerView="playerView" :rows="tableRows" />
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalPlayersOverview from '@/client/components/overview/PlayersOverview.vue';
import PlayerInfo from '@/client/wrybit/visuals/overview/PlayerInfo.vue';
import OtherPlayer from '@/client/wrybit/visuals/OtherPlayer.vue';
import PlayersTable from '@/client/wrybit/visuals/overview/PlayersTable.vue';
import {PlayersTableRowModel} from '@/client/wrybit/visuals/overview/playersTableLayout';
import {ViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';

function ownPlayerIndex(view: ViewModel): number {
  return view.players.length - 1;
}

export default defineComponent({
  name: 'PlayersOverview',
  extends: CanonicalPlayersOverview,
  components: {PlayerInfo, OtherPlayer, PlayersTable},
  props: {
    // When set, the wide player table is teleported to this selector (the player-home header).
    tableTarget: {type: String, default: undefined},
  },
  computed: {
    tableRows(): Array<PlayersTableRowModel> {
      const players = [...this.playersInOrder];
      if (this.thisPlayer !== undefined) {
        players.push(this.thisPlayer);
      }
      return players.map((player, index) => this.tableRow(player, index));
    },
  },
  methods: {
    ownPlayerIndex,
    tableRow(player: PublicPlayerModel, playerIndex: number): PlayersTableRowModel {
      return {player, playerIndex, firstForGen: this.getIsFirstForGen(player), actionLabel: this.getActionLabel(player)};
    },
  },
});
</script>
