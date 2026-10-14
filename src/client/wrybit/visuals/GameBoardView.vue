<!-- Board tab presentation; all board props and log-highlighting behavior come from our game models. -->
<template>
  <a name="board" class="player_home_anchor hotkey-target"></a>
  <BoardTabs :game="game" :players="players" :tileView="tileView" @toggleTileView="$emit('toggleTileView')">
    <template #mars>
      <Board :spaces="game.spaces" :expansions="game.gameOptions.expansions" :venusScaleLevel="game.venusScaleLevel"
        :boardName="game.gameOptions.boardName" :globalParameters="game.gameOptions.globalParameters"
        :customBoardRows="game.gameOptions.customBoardRows" :oceans_count="game.oceans" :oxygen_level="game.oxygenLevel"
        :temperature="game.temperature" :altVenusBoard="game.gameOptions.altVenusBoard" :aresData="game.aresData"
        :tileView="tileView" @toggleTileView="$emit('toggleTileView')" id="shortkey-board"/>
    </template>
    <template #moon><MoonBoard v-if="game.moon" :model="game.moon" :tileView="tileView" id="shortkey-moonBoard"/></template>
    <template #colonies>
      <div class="colonies-fleets-cont">
        <div class="colonies-player-fleets" v-for="player in players" :key="player.color">
          <div :class="'colonies-fleet colonies-fleet-' + player.color" v-for="idx in Math.max(0, player.fleetSize - player.tradesThisGeneration)" :key="idx"></div>
        </div>
      </div>
      <div class="player_home_colony_cont">
        <div class="player_home_colony" v-for="colony in game.colonies" :key="colony.name"><Colony :colony="colony" :active="colony.isActive"/></div>
      </div>
    </template>
    <template #turmoil><Turmoil v-if="game.turmoil" :turmoil="game.turmoil" :morePartiesExpansion="game.gameOptions.expansions.moreParties" :agendaStyle="game.gameOptions.politicalAgendasExtension"/></template>
    <template #paths><PlanetaryTracks v-if="game.pathfinders" :tracks="game.pathfinders" :gameOptions="game.gameOptions"/></template>
    <template #delta><DeltaProjectBoard :players="players"/></template>
    <template #venus><VenusSurfaceBoard v-if="game.venusPhase2" :model="game.venusPhase2" :tileView="tileView"
      :venusScaleLevel="game.venusScaleLevel" :altVenusBoard="game.gameOptions.altVenusBoard"
      :venusScaleMax="game.gameOptions.globalParameters?.venus.max" id="shortkey-venusBoard"/></template>
    <template #orbit><HighOrbitMarket v-if="game.highOrbitMarket" :market="game.highOrbitMarket"/></template>
    <template #teams><ConglomeratesTeams v-if="game.conglomerates" :model="game.conglomerates"/></template>
  </BoardTabs>
  <div v-if="players.length > 1" class="player_home_block--milestones-and-awards">
    <a class="hotkey-target"></a>
    <Milestones :milestones="game.milestones" :conglomeratesExpansion="game.gameOptions.expansions.conglomerates"/>
    <Awards :awards="game.awards" :conglomeratesExpansion="game.gameOptions.expansions.conglomerates"/>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CanonicalGameBoardView from '@/client/components/GameBoardView.vue';
import BoardTabs from '@/client/wrybit/visuals/boardTabs/BoardTabs.vue';
import Board from '@/client/wrybit/visuals/Board.vue';
import Colony from '@/client/components/colonies/Colony.vue';
import Milestones from '@/client/wrybit/visuals/Milestones.vue';
import Awards from '@/client/wrybit/visuals/Awards.vue';
import {SpaceId} from '@/common/Types';
import {selectBoardTab} from '@/client/wrybit/visuals/boardTabs/boardTabState';

export default defineComponent({
  name: 'GameBoardView',
  extends: CanonicalGameBoardView,
  components: {BoardTabs, Board, Colony, Milestones, Awards},
  methods: {
    highlightSpace(spaceId: SpaceId) {
      const moonSpace = this.game.moon?.spaces.some((space) => space.id === spaceId);
      const venusSpace = this.game.venusPhase2?.spaces.some((space) => space.id === spaceId);
      selectBoardTab(moonSpace ? 'moon' : venusSpace ? 'venus' : 'mars');
      this.$nextTick(() => CanonicalGameBoardView.methods?.highlightSpace.call(this, spaceId));
    },
  },
});
</script>
