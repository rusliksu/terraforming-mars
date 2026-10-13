<template>
  <div class="select_space_cont">
    <ConfirmDialog
        message="Place your tile here?"
        :enableDontShowAgainCheckbox="true"
        ref="confirmation"
        @accept="confirmPlacement"
        @dismiss="cancelPlacement"
        @hide="hideDialog" />
    <div v-if="showtitle" class="wf-select-space">
      {{ $t(playerinput.title) }}
      <GoToMap :playerinput="playerinput"/>
    </div>
    <div v-if="warning" class="nes-container is-rounded">
      <span class="nes-text is-warning" v-i18n>{{ warning }}</span>
      <GoToMap :playerinput="playerinput"/>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, inject} from 'vue';
import {INPUT_HOSTS} from '@/client/wrybit/shell/inputHosts';
import {SelectSpaceModel} from '@/common/models/PlayerInputModel';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {getPreferences, PreferencesManager} from '@/client/utils/PreferencesManager';
import {SelectSpaceResponse} from '@/common/inputs/InputResponse';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';
import GoToMap from '@/client/components/waitingFor/GoToMap.vue';
import {SpaceId} from '@/common/Types';


type Refs = {
  confirmation: InstanceType<typeof ConfirmDialog>;
};

type DataModel = {
  spaces: Set<SpaceId>;
  selectedTile: HTMLElement | undefined,
  selectedSpaceId: SpaceId | undefined;
  boundTiles: Array<{tile: HTMLElement, handler: () => void}>;
  submitted: boolean;
  spaceId: SpaceId | undefined;
  warning: string | undefined;
};

export default defineComponent({
  name: 'SelectSpace',
  setup() {
    return {inputHost: inject(INPUT_HOSTS, undefined)?.target};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => SelectSpaceModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: SelectSpaceResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
      required: true,
    },
    showtitle: {
      type: Boolean,
      required: true,
    },
  },
  data(): DataModel {
    return {
      spaces: new Set(this.playerinput.spaces),
      selectedTile: undefined,
      selectedSpaceId: undefined,
      boundTiles: [],
      submitted: false,
      spaceId: undefined,
      warning: undefined,
    };
  },
  components: {
    ConfirmDialog,
    GoToMap,
  },
  computed: {
    typedRefs(): Refs {
      return this.$refs as unknown as Refs;
    },
  },
  watch: {
    inputHost() {
      this.$nextTick(() => this.bindBoard());
    },
  },
  methods: {
    clearBoardHandlers() {
      for (const {tile, handler} of this.boundTiles) {
        if (tile.onclick === handler) {
          tile.onclick = null;
        }
        tile.classList.remove('board-space--available', 'board-space--selected');
      }
      this.boundTiles = [];
    },
    bindBoard() {
      this.clearBoardHandlers();
      const tiles = this.getSelectableSpaces();
      this.selectedTile = tiles.find((tile) => tile.getAttribute('data_space_id') === this.selectedSpaceId);
      if (this.submitted) {
        this.selectedTile?.classList.add('board-space--selected');
        return;
      }
      this.disableAnimation();
      if (this.selectedTile === undefined) {
        this.animateSpaces(tiles);
      }
      for (const tile of tiles) {
        const spaceId = tile.getAttribute('data_space_id') as SpaceId | null;
        if (spaceId === null || !this.spaces.has(spaceId)) {
          continue;
        }
        const handler = () => this.onTileSelected(tile);
        tile.onclick = handler;
        this.boundTiles.push({tile, handler});
      }
    },
    animateSpace(tile: Element, activate: boolean) {
      if (activate) {
        tile.classList.add('board-space--available');
      } else {
        tile.classList.remove('board-space--available');
      }
    },
    animateSpaces(tiles: Array<Element>) {
      tiles.forEach((tile: Element) => {
        const spaceId = tile.getAttribute('data_space_id') as SpaceId;
        if (spaceId !== null && this.spaces.has(spaceId)) {
          this.animateSpace(tile, true);
        }
      });
    },
    cancelPlacement() {
      if (this.selectedTile === undefined) {
        throw new Error('unexpected, no tile selected!');
      }
      this.animateSpace(this.selectedTile, false);
      this.selectedTile = undefined;
      this.selectedSpaceId = undefined;
      this.animateSpaces(this.getSelectableSpaces());
    },
    confirmPlacement() {
      this.clearBoardHandlers();

      if (this.selectedTile === undefined) {
        throw new Error('unexpected, no tile selected!');
      }
      const spaceId = this.selectedTile.getAttribute('data_space_id') as SpaceId;
      if (spaceId === null) {
        throw new Error('unexpected, space has no id');
      }
      this.spaceId = spaceId;
      this.submitted = true;
      this.selectedTile.classList.add('board-space--selected');
      this.saveData();
    },
    disableAnimation() {
      const tiles = this.getSelectableSpaces();
      tiles.forEach((tile) => {
        tile.classList.remove('board-space--available', 'board-space--selected');
      });
    },
    getSelectableSpaces(): Array<HTMLElement> {
      const spaces: Array<HTMLElement> = [];

      const regions = ['main_board', 'moon_board', 'colony_spaces', 'moon_board_outer_spaces', 'venus_board', 'venus_board_outer_spaces'];
      for (const region of regions) {
        const board = document.getElementById(region);
        if (board !== null) {
          const array = board.getElementsByClassName('board-space-selectable');
          for (let i = 0, length = array.length; i < length; i++) {
            spaces.push(array[i] as HTMLElement);
          }
        }
      }

      return spaces;
    },
    hideDialog(hide: boolean) {
      PreferencesManager.INSTANCE.set('hide_tile_confirmation', hide);
    },
    onTileSelected(tile: HTMLElement) {
      this.selectedTile = tile;
      this.selectedSpaceId = tile.getAttribute('data_space_id') as SpaceId;
      this.disableAnimation();
      this.animateSpace(tile, true);
      tile.classList.remove('board-space--available');
      const hideTileConfirmation = getPreferences().hide_tile_confirmation;
      if (hideTileConfirmation) {
        this.confirmPlacement();
      } else {
        this.typedRefs.confirmation.show();
      }
    },
    saveData() {
      if (this.spaceId === undefined) {
        this.warning = 'Must select a space';
        return;
      }
      this.onsave({type: 'space', spaceId: this.spaceId});
    },
  },
  mounted() {
    this.bindBoard();
  },
  beforeUnmount() {
    this.clearBoardHandlers();
  },
});

</script>
