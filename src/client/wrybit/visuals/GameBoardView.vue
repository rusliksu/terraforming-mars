<!-- Board tab presentation; all board props and log-highlighting behavior come from our game models. -->
<template>
  <a name="board" class="player_home_anchor hotkey-target"></a>
  <BoardTabs :game="game" :players="players" :tileView="tileView" :reservedMarsHeight="reservedMarsHeight" @toggleTileView="$emit('toggleTileView')">
    <template #mars>
      <Teleport :to="boardZoomTarget ?? 'body'" :disabled="boardZoomTarget === undefined || zoomBoard !== 'mars'">
      <Board ref="columnMars" class="board-cont--zoomable" @click="onBoardClick($event, 'mars')" :spaces="game.spaces" :expansions="game.gameOptions.expansions" :venusScaleLevel="game.venusScaleLevel"
        :boardName="game.gameOptions.boardName" :globalParameters="game.gameOptions.globalParameters"
        :customBoardRows="game.gameOptions.customBoardRows" :oceans_count="game.oceans" :oxygen_level="game.oxygenLevel"
        :temperature="game.temperature" :altVenusBoard="game.gameOptions.altVenusBoard" :aresData="game.aresData"
        :tileView="tileView" @toggleTileView="$emit('toggleTileView')" id="shortkey-board"/>
      </Teleport>
    </template>
    <template #marsAside><slot name="marsAside"/></template>
    <template #moon><Teleport :to="boardZoomTarget ?? 'body'" :disabled="boardZoomTarget === undefined || zoomBoard !== 'moon'">
      <MoonBoard v-if="game.moon" ref="columnMoon" class="board-cont--zoomable" @click="onBoardClick($event, 'moon')" :model="game.moon" :tileView="tileView" id="shortkey-moonBoard"/>
    </Teleport></template>
    <template #colonies>
      <ColoniesBoard :colonies="game.colonies" :players="players" :viewer="viewer"/>
    </template>
    <template #turmoil><TurmoilBoard v-if="game.turmoil" :turmoil="game.turmoil" :viewer="viewer" :generation="game.generation" :moreParties="game.gameOptions.expansions.moreParties"/></template>
    <template #paths><PlanetsBoard v-if="game.pathfinders" :model="game.pathfinders" :gameOptions="game.gameOptions"/></template>
    <template #delta><DeltaBoard :players="players" :viewerColor="viewer?.color"/></template>
    <template #venus><Teleport :to="boardZoomTarget ?? 'body'" :disabled="boardZoomTarget === undefined || zoomBoard !== 'venus'">
      <VenusSurfaceBoard v-if="game.venusPhase2" ref="columnVenus" class="board-cont--zoomable" @click="onBoardClick($event, 'venus')" :model="game.venusPhase2" :tileView="tileView"
      :venusScaleLevel="game.venusScaleLevel" :altVenusBoard="game.gameOptions.altVenusBoard"
      :venusScaleMax="game.gameOptions.globalParameters?.venus.max" id="shortkey-venusBoard"/>
    </Teleport></template>
    <template #orbit><HighOrbitMarket v-if="game.highOrbitMarket" :market="game.highOrbitMarket"/></template>
    <template #teams><ConglomeratesTeams v-if="game.conglomerates" :model="game.conglomerates"/></template>
  </BoardTabs>
  <BoardZoomModal :open="boardZoomOpen" :origin="zoomOrigin" :frame="zoomBoard === 'mars' && game.gameOptions.boardName !== BoardName.CUSTOM ? marsFrame : undefined"
    @target="boardZoomTarget = $event" @rendered="zoomGeometry.revision.value++" @hidden="onZoomHidden" @close="closeBoardZoom">
    <template #banner><PlacementBanner v-if="placementInput !== undefined" :description="nativePlacementDescription(placementInput)"/></template>
  </BoardZoomModal>
  <div v-if="players.length > 1" class="player_home_block--milestones-and-awards">
    <a class="hotkey-target"></a>
    <Milestones :milestones="game.milestones" :conglomeratesExpansion="game.gameOptions.expansions.conglomerates"/>
    <Awards :awards="game.awards" :conglomeratesExpansion="game.gameOptions.expansions.conglomerates"/>
  </div>
</template>

<script lang="ts">
import {defineComponent, markRaw, ref} from 'vue';
import type {PropType} from 'vue';
import type {ComponentPublicInstance} from 'vue';
import CanonicalGameBoardView from '@/client/components/GameBoardView.vue';
import BoardTabs from '@/client/wrybit/visuals/boardTabs/BoardTabs.vue';
import Board from '@/client/wrybit/visuals/Board.vue';
import MoonBoard from '@/client/wrybit/expansions/moon/MoonBoard.vue';
import DeltaBoard from '@/client/wrybit/expansions/delta/DeltaBoard.vue';
import PlanetsBoard from '@/client/wrybit/expansions/pathfinders/PlanetsBoard.vue';
import TurmoilBoard from '@/client/wrybit/expansions/turmoil/TurmoilBoard.vue';
import ColoniesBoard from '@/client/wrybit/expansions/colonies/ColoniesBoard.vue';
import type {PublicPlayerModel} from '@/common/models/PlayerModel';
import Milestones from '@/client/wrybit/visuals/Milestones.vue';
import Awards from '@/client/wrybit/visuals/Awards.vue';
import {SpaceId} from '@/common/Types';
import {selectBoardTab} from '@/client/wrybit/visuals/boardTabs/boardTabState';
import BoardZoomModal from './board/BoardZoomModal.vue';
import PlacementBanner from './board/PlacementBanner.vue';
import {nativePlacementDescription} from './board/placementDescription';
import {RING_FRAME} from './board/mobileBoardZoom';
import {registerBoardZoomSurface, ZoomBoard} from './board/boardZoomSurface';
import {isBoardPlacementActive} from './board/boardPlacementActive';
import type {SelectSpaceModel} from '@/common/models/PlayerInputModel';
import {BoardName} from '@/common/boards/BoardName';

export default defineComponent({
  name: 'GameBoardView',
  extends: CanonicalGameBoardView,
  components: {BoardTabs, Board, ColoniesBoard, TurmoilBoard, MoonBoard, PlanetsBoard, DeltaBoard, Milestones, Awards, BoardZoomModal, PlacementBanner},
  props: {
    viewer: {type: Object as PropType<PublicPlayerModel>, default: undefined},
  },
  setup() {
    return {zoomGeometry: markRaw({revision: ref(0)}), marsFrame: RING_FRAME, BoardName};
  },
  data() {
    return {boardZoomOpen: false, boardZoomTarget: undefined as HTMLElement | undefined, zoomOrigin: undefined as HTMLElement | undefined,
      zoomBoard: 'mars' as ZoomBoard, reservedMarsHeight: undefined as number | undefined,
      placementInput: undefined as SelectSpaceModel | undefined, unregisterZoom: undefined as (() => void) | undefined,
      zoomOwner: undefined as symbol | undefined,
      zoomWaiters: markRaw(new Set<() => void>())};
  },
  mounted() {
    this.registerZoomSurface();
  },
  beforeUnmount() {
    this.unregisterZoom?.();
    this.zoomWaiters.forEach((finish) => finish());
  },
  watch: {
    'game.gameId'() {
      void this.closeBoardZoom();
      this.registerZoomSurface();
    },
  },
  methods: {
    nativePlacementDescription,
    registerZoomSurface() {
      this.unregisterZoom?.();
      const view = this;
      this.unregisterZoom = registerBoardZoomSurface(this.game.gameId, {
        get boards() {
          const boards: Array<ZoomBoard> = ['mars'];
          if (view.game.moon !== undefined) {
            boards.push('moon');
          }
          if (view.game.venusPhase2 !== undefined) {
            boards.push('venus');
          }
          return boards;
        },
        revision: this.zoomGeometry.revision,
        open: (board, input, owner) => this.openBoardZoom(board, input, owner),
        close: (owner) => owner !== undefined && this.zoomOwner !== undefined && owner !== this.zoomOwner ? Promise.resolve() : this.closeBoardZoom(),
      });
    },
    openBoardZoom(board: ZoomBoard, input?: SelectSpaceModel, owner?: symbol) {
      if (this.boardZoomOpen) {
        return;
      }
      const element = (this.$refs[{mars: 'columnMars', moon: 'columnMoon', venus: 'columnVenus'}[board]] as ComponentPublicInstance | undefined)?.$el;
      const origin = element instanceof Element ? element.parentElement : null;
      if (origin === null) {
        return;
      }
      selectBoardTab(board);
      this.zoomOrigin = origin;
      this.zoomBoard = board;
      this.placementInput = input;
      this.zoomOwner = owner;
      this.reservedMarsHeight = board === 'mars' ? origin.offsetHeight : undefined;
      this.boardZoomOpen = true;
    },
    onBoardClick(event: MouseEvent, board: ZoomBoard) {
      const target = event.target;
      if (isBoardPlacementActive() || (target instanceof Element && target.closest('.hide-tile-button, .tile-view-toggle') !== null)) {
        return;
      }
      this.openBoardZoom(board);
    },
    closeBoardZoom(): Promise<void> {
      if (!this.boardZoomOpen && this.boardZoomTarget === undefined) {
        return Promise.resolve();
      }
      this.boardZoomOpen = false;
      return new Promise((resolve) => {
        const finish = () => {
          window.clearTimeout(timeout);
          this.zoomWaiters.delete(finish);
          resolve();
        };
        const timeout = window.setTimeout(finish, 1000);
        this.zoomWaiters.add(finish);
      });
    },
    onZoomHidden() {
      this.reservedMarsHeight = undefined;
      this.placementInput = undefined;
      this.zoomOwner = undefined;
      this.zoomGeometry.revision.value++;
      this.zoomWaiters.forEach((finish) => finish());
    },
    highlightSpace(spaceId: SpaceId) {
      const moonSpace = this.game.moon?.spaces.some((space) => space.id === spaceId);
      const venusSpace = this.game.venusPhase2?.spaces.some((space) => space.id === spaceId);
      selectBoardTab(moonSpace ? 'moon' : venusSpace ? 'venus' : 'mars');
      this.$nextTick(() => CanonicalGameBoardView.methods?.highlightSpace.call(this, spaceId));
    },
  },
});
</script>
