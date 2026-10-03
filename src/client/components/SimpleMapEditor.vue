<template>
  <div class="simple-map-editor">
    <h1 v-i18n>{{ title }}</h1>
    <div class="simple-map-editor-board-nav">
      <a :href="paths.MAP_EDITOR" v-i18n>Mars Map Editor</a>
      <a :href="paths.MAP_EDITOR + (boardType === 'moon' ? '?board=venus' : '?board=moon')" v-i18n>
        {{ boardType === 'moon' ? 'Venus Phase 2 Map Editor' : 'Moon Map Editor' }}
      </a>
    </div>
    <p v-if="boardType === 'moon'" class="simple-map-editor-note" v-i18n>
      The Luna Trade Station and Momentum Virium reserved spots shown in the preview below are
      placed automatically by the game and can't be painted here.
    </p>
    <p v-else class="simple-map-editor-note" v-i18n>
      Reserve a hex below for Stratopolis or Maxwell Base with the tools under "Reserved spots" --
      leave both unreserved to keep the default off-grid placement instead.
    </p>

    <div class="simple-map-editor-layout">
      <div class="simple-map-editor-controls">
        <label class="simple-map-editor-field">
          <span v-i18n>Name</span>
          <input type="text" v-model="name" :maxlength="MAX_SIMPLE_BOARD_NAME_LENGTH">
        </label>

        <fieldset class="simple-map-editor-tools">
          <legend v-i18n>Terrain</legend>
          <label v-for="t in terrainTools" :key="t.key" :title="t.description">
            <input type="radio" name="tool" :value="t.key" v-model="tool">
            <i class="simple-map-editor-swatch" :class="'simple-map-editor-swatch--' + t.spaceType"></i>
            <span>{{ t.label }}</span>
          </label>
        </fieldset>

        <fieldset class="simple-map-editor-tools">
          <legend v-i18n>Shape</legend>
          <p class="simple-map-editor-tools-note" v-i18n>
            Click a hex to remove it from the board entirely -- click a voided hex again (with any
            tool) to restore it.
          </p>
          <label :title="'Removes the hex from the board entirely -- click again with any tool to restore it.'">
            <input type="radio" name="tool" value="void:toggle" v-model="tool">
            <i class="simple-map-editor-swatch simple-map-editor-swatch--void">✕</i>
            <span v-i18n>Void (no hex)</span>
          </label>
        </fieldset>

        <fieldset v-if="reservedTools.length > 0" class="simple-map-editor-tools">
          <legend v-i18n>Reserved spots</legend>
          <p class="simple-map-editor-tools-note" v-i18n>Click a hex to reserve it. Each spot can only be on one hex at a time -- picking a new one moves it.</p>
          <label :title="'Unreserve the hex you click, if it was reserved.'">
            <input type="radio" name="tool" value="reserved:clear" v-model="tool">
            <i class="simple-map-editor-swatch simple-map-editor-swatch--clear-reserved">∅</i>
            <span v-i18n>Clear reservation</span>
          </label>
          <label v-for="t in reservedTools" :key="t.key" :title="t.description">
            <input type="radio" name="tool" :value="t.key" v-model="tool">
            <i class="simple-map-editor-swatch" :class="'simple-map-editor-swatch--' + t.css"></i>
            <span>{{ t.label }}</span>
          </label>
        </fieldset>

        <fieldset v-if="bonusTools.length > 0" class="simple-map-editor-tools">
          <legend v-i18n>Bonuses</legend>
          <p class="simple-map-editor-tools-note" v-i18n>Click a hex to add this bonus — bonuses stack. Right-click a hex to remove its last bonus.</p>
          <label :title="'Remove every bonus from the hex you click.'">
            <input type="radio" name="tool" value="bonus:clear" v-model="tool">
            <i class="simple-map-editor-bonus-icon simple-map-editor-bonus-icon--clear">∅</i>
            <span v-i18n>Clear bonuses</span>
          </label>
          <label v-for="t in bonusTools" :key="t.key" :title="t.description">
            <input type="radio" name="tool" :value="t.key" v-model="tool">
            <i class="simple-map-editor-bonus-icon" :class="'board-space-bonus--' + t.css"></i>
            <span>{{ t.label }}</span>
          </label>
        </fieldset>

        <p class="simple-map-editor-tool-hint">{{ currentToolHint }}</p>
      </div>

      <div class="simple-map-editor-canvas">
        <div class="simple-map-editor-grid-wrap">
          <div class="simple-map-editor-grid" :style="gridStyle">
            <button
              v-for="(cell, i) in grid"
              :key="i"
              type="button"
              class="simple-map-editor-hex"
              :class="'simple-map-editor-swatch--' + (cell.voided ? 'void' : (cell.reserved ?? cell.spaceType))"
              :style="hexStyle(cell)"
              @click="paint(i)"
              @contextmenu.prevent="removeLastBonus(i)"
              :title="cell.x + ',' + cell.y + (cell.voided ? ' (void)' : cell.reserved ? ' (' + reservedLabel(cell.reserved) + ')' : '')"
            >
              <span class="simple-map-editor-hex-bonuses" v-if="!cell.voided && cell.bonus.length > 0">
                <i
                  v-for="(item, bi) in groupedBonus(cell.bonus)"
                  :key="bi"
                  class="simple-map-editor-hex-bonus"
                  :class="'board-space-bonus--' + bonusCss(item.bonus)"
                ></i>
              </span>
            </button>
          </div>
        </div>

        <label class="simple-map-editor-code">
          <span v-i18n>Map code</span>
          <textarea readonly rows="3" :value="code" @focus="($event.target as HTMLTextAreaElement).select()"></textarea>
        </label>
        <div class="simple-map-editor-actions">
          <button type="button" @click="copyCode" v-i18n>Copy code</button>
          <input type="text" v-model="loadInput" placeholder="Paste a TMBS1… code" class="simple-map-editor-load-input">
          <button type="button" @click="loadCode" v-i18n>Load</button>
          <button type="button" class="simple-map-editor-play" @click="play" v-i18n>Play with this map</button>
        </div>
        <div v-if="loadError" class="simple-map-editor-error">{{ loadError }}</div>

        <details class="simple-map-editor-export">
          <summary v-i18n>Copy as default board source</summary>
          <p class="simple-map-editor-tools-note" v-i18n>
            Paste this into {{ boardType === 'moon' ? 'MoonBoard.ts' : 'VenusSurfaceBoard.ts' }}'s own hard-coded default layout, replacing the existing b.row(...) calls.
          </p>
          <textarea readonly rows="8" :value="exportSource" @focus="($event.target as HTMLTextAreaElement).select()"></textarea>
        </details>
      </div>
    </div>

    <div class="simple-map-editor-preview">
      <h3 v-i18n>Preview</h3>

      <fieldset v-if="boardType === 'venusPhase2'" class="simple-map-editor-tools simple-map-editor-backdrop-tools">
        <legend v-i18n>Backdrop alignment</legend>
        <p class="simple-map-editor-tools-note" v-i18n>
          Drag the backdrop below to reposition it; scroll over it (or use the slider) to scale it.
          One-time calibration -- copy the resulting CSS and it becomes the new fixed default.
        </p>
        <label class="simple-map-editor-backdrop-scale">
          <span v-i18n>Scale</span>
          <input type="range" min="50" max="300" step="1" v-model.number="backdropScale">
          <span>{{ backdropScale }}%</span>
        </label>
        <div class="simple-map-editor-actions">
          <button type="button" @click="resetBackdrop" v-i18n>Reset</button>
          <button type="button" @click="copyBackdropCss" v-i18n>Copy backdrop CSS</button>
        </div>
        <label class="simple-map-editor-code">
          <span v-i18n>Backdrop CSS</span>
          <textarea readonly rows="3" :value="backdropCss" @focus="($event.target as HTMLTextAreaElement).select()"></textarea>
        </label>
      </fieldset>

      <fieldset v-if="boardType === 'venusPhase2'" class="simple-map-editor-tools simple-map-editor-backdrop-tools simple-map-editor-track-tools">
        <legend v-i18n>30-60 track calibration</legend>
        <p class="simple-map-editor-tools-note" v-i18n>
          Click each tick mark on the track below, in order from 30 to 60. One-time calibration --
          copy the resulting positions and they become the new fixed defaults.
        </p>
        <p class="simple-map-editor-track-next">
          <template v-if="nextTrackValue !== undefined">
            <span v-i18n>Next:</span> <strong>{{ nextTrackValue }}</strong>
          </template>
          <template v-else>
            <span v-i18n>All 16 placed.</span>
          </template>
        </p>
        <div class="venus-scale-track-2 simple-map-editor-track-calibrate" @click="placeTrackMarker">
          <div
            v-for="entry in trackMarkerEntries"
            :key="entry.value"
            class="simple-map-editor-track-marker"
            :style="{left: (entry.left * 100) + '%', top: (entry.top * 100) + '%'}"
          >{{ entry.value }}</div>
        </div>
        <div class="simple-map-editor-actions">
          <button type="button" @click="undoTrackMarker" :disabled="trackValuesPlaced.length === 0" v-i18n>Undo last</button>
          <button type="button" @click="resetTrackMarkers" v-i18n>Reset</button>
          <button type="button" @click="copyTrackPositions" v-i18n>Copy positions</button>
        </div>
        <label class="simple-map-editor-code">
          <span v-i18n>Track positions</span>
          <textarea readonly rows="6" :value="trackPositionsCode" @focus="($event.target as HTMLTextAreaElement).select()"></textarea>
        </label>
      </fieldset>

      <div class="simple-map-editor-preview-zoom">
        <div
          v-if="boardType === 'venusPhase2'"
          ref="backdropDragEl"
          class="simple-map-editor-backdrop-drag"
          :class="{'simple-map-editor-backdrop-drag--active': draggingBackdrop}"
          :style="backdropStyleVars"
          @mousedown="startBackdropDrag"
          @wheel.prevent="onBackdropWheel"
        >
          <VenusSurfaceBoard :model="previewModel" tileView="show" :showScaleTrack="false"/>
        </div>
        <MoonBoard v-else :model="previewMoonModel" tileView="show"/>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import VenusSurfaceBoard from '@/client/components/venusPhase2/VenusSurfaceBoard.vue';
import MoonBoard from '@/client/components/moon/MoonBoard.vue';
import {SpaceType} from '@/common/boards/SpaceType';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {SpaceModel} from '@/common/models/SpaceModel';
import {VenusPhase2Model} from '@/common/models/VenusPhase2Model';
import {MoonModel} from '@/common/models/MoonModel';
import {
  MAX_SIMPLE_BOARD_NAME_LENGTH,
  SIMPLE_BOARD_SPACE_TYPES,
  SimpleBoardType,
  SimpleCustomBoardDefinition,
  SimpleCustomSpaceDef,
  VenusReservedSpot,
  blankSimpleBoard,
} from '@/common/boards/SimpleCustomBoardDefinition';
import {decodeSimpleBoard, encodeSimpleBoard} from '@/common/boards/simpleBoardCodec';
import {customSpaceId, customSpacePixel, customBoardPixelSize} from '@/common/boards/CustomBoardDefinition';
import {NamedMoonSpaces} from '@/common/moon/NamedMoonSpaces';
import {SpaceId, isSpaceId, safeCast} from '@/common/Types';
import {paths} from '@/common/app/paths';
import {groupSpaceBonuses, GroupedSpaceBonus} from '@/client/utils/spaceBonusIcon';

// Mirrors src/server/venusPhase2/VenusSurfaceBoard.ts's own VENUS_STRATOPOLIS/VENUS_MAXWELL_BASE
// constants -- duplicated here (as literal ids, not an import) because that file is server-only;
// this client component only needs the ids to build stub preview entries, never the board logic.
const VENUS_STRATOPOLIS: SpaceId = safeCast('298', isSpaceId);
const VENUS_MAXWELL_BASE: SpaceId = safeCast('299', isSpaceId);

// MoonBoard.vue positions every grid hex via hand-tuned CSS keyed to its exact id (.moon-space-m02
// .. .moon-space-m36 in moon.less) -- unlike VenusSurfaceBoard.vue, which positions generically by
// (x, y). A generic id (like customSpaceId's Mars-style '100', '101'...) matches no CSS rule at
// all, so every hex falls back to its default (unstyled) position -- they end up stacked on top of
// each other, which is what a "only one tile visible, plus a weird scrollbar" report looks like.
// This mirrors MoonBoard.ts's own real idOffset (2, since 'm01' is reserved for Luna Trade
// Station) exactly, so the preview uses the very same ids a real game would for this layout.
function moonSpaceId(index: number): SpaceId {
  const id = index + 2;
  const strId = id < 10 ? '0' + id : String(id);
  return safeCast('m' + strId, isSpaceId);
}

type BonusTool = {key: string, bonus: SpaceBonus, css: string, label: string, description: string};

// Both boards share this same "gain resource on tile placement" flavor of bonus -- Moon's mine
// tiles and Venus's Cloud City/Floater Array/Gas Mine tiles all trigger grantSpaceBonuses()
// generically (Game.ts), so nothing here is actually Moon-specific despite the name.
const SHARED_BONUS_TOOLS: Array<BonusTool> = [
  {key: 'bonus:' + SpaceBonus.STEEL, bonus: SpaceBonus.STEEL, css: 'steel', label: 'Steel', description: 'Gain 1 steel when you place a tile on this space.'},
  {key: 'bonus:' + SpaceBonus.TITANIUM, bonus: SpaceBonus.TITANIUM, css: 'titanium', label: 'Titanium', description: 'Gain 1 titanium when you place a tile on this space.'},
  {key: 'bonus:' + SpaceBonus.DRAW_CARD, bonus: SpaceBonus.DRAW_CARD, css: 'card', label: 'Card', description: 'Draw 1 card when you place a tile on this space.'},
];

// Venus gets a few more, on top of the shared set -- energy/heat/M€ are plain stock gains
// (Game.ts's grantSpaceBonus handles them for any board already), and floater goes to a
// floater-collecting card the player picks among (AddResourcesToCard), same mechanism as card/
// steel/titanium above just targeting a card resource instead of player stock.
const VENUS_BONUS_TOOLS: Array<BonusTool> = [
  ...SHARED_BONUS_TOOLS,
  {key: 'bonus:' + SpaceBonus.ENERGY, bonus: SpaceBonus.ENERGY, css: 'energy', label: 'Energy', description: 'Gain 1 energy when you place a tile on this space.'},
  {key: 'bonus:' + SpaceBonus.HEAT, bonus: SpaceBonus.HEAT, css: 'heat', label: 'Heat', description: 'Gain 1 heat when you place a tile on this space.'},
  {key: 'bonus:' + SpaceBonus.MEGACREDITS, bonus: SpaceBonus.MEGACREDITS, css: 'megacredit', label: 'M€', description: 'Gain 1 M€ when you place a tile on this space.'},
  {key: 'bonus:' + SpaceBonus.FLOATER, bonus: SpaceBonus.FLOATER, css: 'floater', label: 'Floater', description: 'Add 1 floater to a card that collects them when you place a tile on this space.'},
];

const BONUS_TOOLS_BY_BOARD: Record<SimpleBoardType, Array<BonusTool>> = {
  moon: SHARED_BONUS_TOOLS,
  venusPhase2: VENUS_BONUS_TOOLS,
};

type ReservedTool = {key: string, spot: VenusReservedSpot, css: string, label: string, description: string};

const RESERVED_TOOLS: Array<ReservedTool> = [
  {key: 'reserved:stratopolis', spot: 'stratopolis', css: 'stratopolis', label: 'Stratopolis', description: 'Reserve this hex for the Stratopolis card\'s city tile.'},
  {key: 'reserved:maxwellBase', spot: 'maxwellBase', css: 'maxwellBase', label: 'Maxwell Base', description: 'Reserve this hex for the Maxwell Base card\'s city tile.'},
];

const RESERVED_TOOLS_BY_BOARD: Record<SimpleBoardType, Array<ReservedTool>> = {
  moon: [],
  venusPhase2: RESERVED_TOOLS,
};

const RESERVED_LABELS: Record<VenusReservedSpot, string> = {
  stratopolis: 'Stratopolis',
  maxwellBase: 'Maxwell Base',
};

const TERRAIN_LABELS: Record<SpaceType, {label: string, description: string}> = {
  [SpaceType.LAND]: {label: 'Land', description: 'Open surface.'},
  [SpaceType.LUNAR_MINE]: {label: 'Mine', description: 'Only mine tiles may be placed here.'},
  [SpaceType.GASLIGHT]: {label: 'Gaslight', description: 'Only Gas Mine tiles may be placed here.'},
} as Record<SpaceType, {label: string, description: string}>;

const MAX_HEX_BONUSES = 8;

export default defineComponent({
  name: 'SimpleMapEditor',
  components: {VenusSurfaceBoard, MoonBoard},
  props: {
    boardType: {
      type: String as PropType<SimpleBoardType>,
      required: true,
    },
  },
  data() {
    const def = blankSimpleBoard(this.boardType, this.boardType === 'moon' ? 'My Moon' : 'My Venus');
    return {
      name: def.name,
      grid: def.spaces,
      tool: 'type:' + SIMPLE_BOARD_SPACE_TYPES[this.boardType][0],
      loadInput: '',
      loadError: '',
      MAX_SIMPLE_BOARD_NAME_LENGTH,
      // Venus-only backdrop calibration tool -- see backdropStyleVars/backdropCss below. Starts
      // at the real board's own shipped default (venusphase2.less's var() fallback), so opening
      // the tool shows the actual current alignment rather than an arbitrary starting point.
      backdropX: 0,
      backdropY: 0,
      backdropScale: 92,
      draggingBackdrop: false,
      // Venus-only 30-60 track calibration tool -- see trackMarkers/nextTrackValue/
      // trackPositionsCode below. Empty to start: unlike the backdrop tool (which has a real
      // shipped default to show), VenusSurfaceBoard.vue's own VENUS_2_TRACK_POSITIONS is already
      // just an eyeballed guess, so there's no "current calibration" worth pre-loading here.
      trackMarkers: {} as Partial<Record<number, {left: number, top: number}>>,
    };
  },
  computed: {
    paths: () => paths,
    title(): string {
      return this.boardType === 'moon' ? 'Moon Map Editor' : 'Venus Phase 2 Map Editor';
    },
    terrainTools(): Array<{key: string, spaceType: SpaceType, label: string, description: string}> {
      return SIMPLE_BOARD_SPACE_TYPES[this.boardType].map((spaceType) => ({
        key: 'type:' + spaceType,
        spaceType,
        ...TERRAIN_LABELS[spaceType],
      }));
    },
    bonusTools(): Array<BonusTool> {
      return BONUS_TOOLS_BY_BOARD[this.boardType];
    },
    reservedTools(): Array<ReservedTool> {
      return RESERVED_TOOLS_BY_BOARD[this.boardType];
    },
    currentToolHint(): string {
      if (this.tool === 'bonus:clear') {
        return 'Remove every bonus from the hex you click.';
      }
      if (this.tool === 'reserved:clear') {
        return 'Unreserve the hex you click, if it was reserved.';
      }
      if (this.tool === 'void:toggle') {
        return 'Removes the hex from the board entirely -- click again with any tool to restore it.';
      }
      const all = [...this.terrainTools, ...this.bonusTools, ...this.reservedTools];
      return all.find((t) => t.key === this.tool)?.description ?? '';
    },
    definition(): SimpleCustomBoardDefinition {
      return {
        version: 1,
        boardType: this.boardType,
        name: this.name.slice(0, MAX_SIMPLE_BOARD_NAME_LENGTH),
        spaces: this.grid,
      };
    },
    code(): string {
      return encodeSimpleBoard(this.definition);
    },
    previewModel(): VenusPhase2Model {
      // A hex the user reserved gets the real fixed id/COLONY type here too, so the preview shows
      // it exactly where it'll actually land in a game (VenusSurfaceBoard.vue renders it on the
      // main grid, same as any other cell, now that it has a real (x, y)). Whichever of the two
      // *isn't* reserved on-grid still gets its off-grid stub, matching the board-building
      // fallback in VenusSurfaceBoard.ts -- these are always present in a real game (gated by the
      // Venus expansion, not by this editable definition), so the preview isn't misleadingly
      // missing one just because this particular layout didn't place it yet.
      const hasStratopolis = this.grid.some((s) => s.reserved === 'stratopolis');
      const hasMaxwellBase = this.grid.some((s) => s.reserved === 'maxwellBase');
      const fallback: Array<SpaceModel> = [
        ...(hasStratopolis ? [] : [{id: VENUS_STRATOPOLIS, x: -1, y: -1, spaceType: SpaceType.COLONY, bonus: []}]),
        ...(hasMaxwellBase ? [] : [{id: VENUS_MAXWELL_BASE, x: -1, y: -1, spaceType: SpaceType.COLONY, bonus: []}]),
      ];
      // A voided cell doesn't exist on the real board at all (VenusSurfaceBoard.ts's build() skips
      // creating a Space for it) -- mirror that here rather than showing a phantom hex.
      const painted = this.grid.flatMap((s, i): Array<SpaceModel> => s.voided === true ? [] : [this.toSpaceModel(s, i)]);
      return {spaces: [...fallback, ...painted]};
    },
    previewMoonModel(): MoonModel {
      // Unlike VenusSurfaceBoard.vue, MoonBoard.vue's own template unconditionally looks up
      // 'm01'/'m37' by id -- it crashes without these two stub reserved spaces present, since
      // they're always there in a real game regardless of this editable definition.
      const reserved: Array<SpaceModel> = [
        {id: NamedMoonSpaces.LUNA_TRADE_STATION, x: -1, y: -1, spaceType: SpaceType.COLONY, bonus: []},
        {id: NamedMoonSpaces.MOMENTUM_VIRIUM, x: -1, y: -1, spaceType: SpaceType.COLONY, bonus: []},
      ];
      // A voided cell doesn't exist on the real board at all (MoonBoard.ts's build() skips
      // creating a Space for it, though it still keeps moonSpaceId's numbering stable for every
      // cell after it) -- mirror that here rather than showing a phantom hex.
      const painted = this.grid.flatMap((s, i): Array<SpaceModel> =>
        s.voided === true ? [] : [{id: moonSpaceId(i), x: s.x, y: s.y, spaceType: s.spaceType, bonus: s.bonus}]);
      return {
        spaces: [...reserved, ...painted],
        habitatRate: 0,
        miningRate: 0,
        logisticRate: 0,
      };
    },
    gridStyle(): Record<string, string> {
      const maxY = Math.max(...this.grid.map((s) => s.y));
      const maxX = Math.max(...this.grid.map((s) => s.x));
      const {width, height} = customBoardPixelSize(maxX, maxY);
      return {width: `${width}px`, height: `${height}px`};
    },
    exportSource(): string {
      const maxY = Math.max(...this.grid.map((s) => s.y));
      const rows: Array<Array<SimpleCustomSpaceDef>> = [];
      for (let y = 0; y <= maxY; y++) {
        rows.push(this.grid.filter((s) => s.y === y));
      }
      const tool = (space: SimpleCustomSpaceDef): string => {
        if (space.voided === true) {
          return '.void()';
        }
        const method = space.reserved === 'stratopolis' ? 'stratopolis' :
          space.reserved === 'maxwellBase' ? 'maxwellBase' :
            space.spaceType === SpaceType.LAND ? 'land' :
              space.spaceType === SpaceType.LUNAR_MINE ? 'mine' : 'gaslight';
        const bonusArgs = space.reserved !== undefined ? '' : space.bonus.map((b) => `SpaceBonus.${SpaceBonus[b]}`).join(', ');
        return `.${method}(${bonusArgs})`;
      };
      const lines = rows.map((row) => {
        const startX = row.length > 0 ? row[0].x : 0;
        return `b.row(${startX})${row.map(tool).join('')};`;
      });
      return lines.join('\n');
    },
    // Drives .venus-board-cont's --venus-backdrop-position/--venus-backdrop-size custom
    // properties (see venusphase2.less) via inline style on this wrapper -- CSS custom properties
    // inherit through the DOM regardless of Vue component boundaries, so VenusSurfaceBoard.vue's
    // own template needs no prop for this.
    backdropStyleVars(): Record<string, string> {
      return {
        '--venus-backdrop-position': `${this.backdropX}% ${this.backdropY}%`,
        '--venus-backdrop-size': `${this.backdropScale}%`,
      };
    },
    backdropCss(): string {
      return `background-position: ${this.backdropX}% ${this.backdropY}%;\nbackground-size: ${this.backdropScale}%;`;
    },
    // Ascending, since trackMarkers' numeric keys already iterate that way, but Object.keys
    // returns strings -- convert back to number so nextTrackValue/copy output stay numeric.
    trackValuesPlaced(): Array<number> {
      return Object.keys(this.trackMarkers).map(Number).sort((a, b) => a - b);
    },
    trackMarkerEntries(): Array<{value: number, left: number, top: number}> {
      return this.trackValuesPlaced.flatMap((v) => {
        const pos = this.trackMarkers[v];
        return pos === undefined ? [] : [{value: v, left: pos.left, top: pos.top}];
      });
    },
    // First even value 30-60 not yet placed, in order -- undefined once all 16 are down.
    nextTrackValue(): number | undefined {
      for (let v = 30; v <= 60; v += 2) {
        if (this.trackMarkers[v] === undefined) {
          return v;
        }
      }
      return undefined;
    },
    // Same literal shape VenusSurfaceBoard.vue's own VENUS_2_TRACK_POSITIONS uses, ready to paste
    // over it directly -- keys sorted ascending regardless of click order (undo/redo can leave
    // them out of order in the underlying object).
    trackPositionsCode(): string {
      const lines = this.trackValuesPlaced.map((v) => {
        const pos = this.trackMarkers[v];
        return pos === undefined ? '' : `  ${v}: {left: ${pos.left.toFixed(3)}, top: ${pos.top.toFixed(3)}},`;
      });
      return lines.join('\n');
    },
  },
  methods: {
    toSpaceModel(s: SimpleCustomSpaceDef, i: number): SpaceModel {
      // Mirrors VenusSurfaceBoard.ts's own build(): a reserved cell always becomes COLONY-typed
      // with the fixed id, regardless of whatever terrain was painted underneath it.
      if (s.reserved === 'stratopolis') {
        return {id: VENUS_STRATOPOLIS, x: s.x, y: s.y, spaceType: SpaceType.COLONY, bonus: []};
      }
      if (s.reserved === 'maxwellBase') {
        return {id: VENUS_MAXWELL_BASE, x: s.x, y: s.y, spaceType: SpaceType.COLONY, bonus: []};
      }
      return {id: customSpaceId(i), x: s.x, y: s.y, spaceType: s.spaceType, bonus: s.bonus};
    },
    paint(index: number): void {
      const space = this.grid[index];
      if (this.tool === 'void:toggle') {
        space.voided = !space.voided;
        this.grid = [...this.grid];
        return;
      }
      // Any other tool implicitly restores a voided hex before applying itself -- a hex that
      // doesn't exist can't be painted, reserved, or given a bonus.
      if (space.voided === true) {
        space.voided = false;
      }
      if (this.tool.startsWith('type:')) {
        space.spaceType = this.tool.slice(5) as SpaceType;
      } else if (this.tool === 'bonus:clear') {
        space.bonus = [];
      } else if (this.tool.startsWith('bonus:')) {
        if (space.bonus.length < MAX_HEX_BONUSES) {
          space.bonus.push(Number(this.tool.slice(6)) as SpaceBonus);
        }
      } else if (this.tool === 'reserved:clear') {
        delete space.reserved;
      } else if (this.tool.startsWith('reserved:')) {
        const spot = this.tool.slice(9) as VenusReservedSpot;
        // Only one hex may hold a given reservation -- picking a new one moves it, rather than
        // leaving the old hex stuck reserved with no way back to it.
        for (const other of this.grid) {
          if (other.reserved === spot) {
            delete other.reserved;
          }
        }
        space.reserved = spot;
      }
      this.grid = [...this.grid];
    },
    reservedLabel(spot: VenusReservedSpot): string {
      return RESERVED_LABELS[spot];
    },
    removeLastBonus(index: number): void {
      const space = this.grid[index];
      if (space.bonus.length === 0) {
        return;
      }
      space.bonus.pop();
      this.grid = [...this.grid];
    },
    hexStyle(cell: SimpleCustomSpaceDef): Record<string, string> {
      const maxY = Math.max(...this.grid.map((s) => s.y));
      const p = customSpacePixel(cell.x, cell.y, maxY);
      return {left: `${p.left}px`, top: `${p.top}px`};
    },
    bonusCss(bonus: SpaceBonus): string {
      return this.bonusTools.find((t) => t.bonus === bonus)?.css ?? '';
    },
    groupedBonus(bonus: Array<SpaceBonus>): Array<GroupedSpaceBonus> {
      return groupSpaceBonuses(bonus);
    },
    copyCode(): void {
      navigator.clipboard?.writeText(this.code);
    },
    loadCode(): void {
      this.loadError = '';
      try {
        const def = decodeSimpleBoard(this.loadInput.trim());
        if (def.boardType !== this.boardType) {
          throw new Error(`That code is for ${def.boardType}, not ${this.boardType}.`);
        }
        this.name = def.name;
        this.grid = def.spaces.map((s) => ({...s, bonus: [...s.bonus]}));
        this.loadInput = '';
      } catch (e) {
        this.loadError = e instanceof Error ? e.message : String(e);
      }
    },
    play(): void {
      const key = this.boardType === 'moon' ? 'customMoonBoardCode' : 'customVenusSurfaceBoardCode';
      try {
        window.localStorage?.setItem(key, this.code);
      } catch (e) {
        // localStorage may be unavailable; fall through -- CreateGameForm.vue's own field lets
        // the code be pasted in manually instead.
      }
      window.location.href = `${paths.NEW_GAME}?${key}=1`;
    },
    // Drag-to-reposition for the backdrop calibration tool. Listens on window (not the element
    // itself) for move/up so dragging still tracks correctly if the cursor leaves the small
    // preview box mid-drag -- a local-only listener would silently stop updating at the edge.
    startBackdropDrag(event: MouseEvent): void {
      const el = this.$refs.backdropDragEl as HTMLElement | undefined;
      if (el === undefined) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startBackdropX = this.backdropX;
      const startBackdropY = this.backdropY;
      this.draggingBackdrop = true;

      const onMove = (moveEvent: MouseEvent) => {
        const dxPercent = ((moveEvent.clientX - startX) / rect.width) * 100;
        const dyPercent = ((moveEvent.clientY - startY) / rect.height) * 100;
        this.backdropX = Math.min(100, Math.max(0, startBackdropX + dxPercent));
        this.backdropY = Math.min(100, Math.max(0, startBackdropY + dyPercent));
      };
      const onUp = () => {
        this.draggingBackdrop = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    onBackdropWheel(event: WheelEvent): void {
      const delta = event.deltaY > 0 ? -5 : 5;
      this.backdropScale = Math.min(300, Math.max(50, this.backdropScale + delta));
    },
    resetBackdrop(): void {
      this.backdropX = 0;
      this.backdropY = 0;
      this.backdropScale = 92;
    },
    copyBackdropCss(): void {
      navigator.clipboard?.writeText(this.backdropCss);
    },
    // Records where the next value's tick mark actually is, as a fraction of the clicked box's
    // own size -- matches exactly how VenusSurfaceBoard.vue's venus2MarkerStyle positions the
    // marker (left/top as a % of .venus-scale-track-2's own box), so these numbers are directly
    // reusable there with no conversion. Ignores clicks once all 16 are placed.
    placeTrackMarker(event: MouseEvent): void {
      if (this.nextTrackValue === undefined) {
        return;
      }
      const el = event.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const left = (event.clientX - rect.left) / rect.width;
      const top = (event.clientY - rect.top) / rect.height;
      this.trackMarkers = {...this.trackMarkers, [this.nextTrackValue]: {left, top}};
    },
    undoTrackMarker(): void {
      const values = this.trackValuesPlaced;
      if (values.length === 0) {
        return;
      }
      const rest = {...this.trackMarkers};
      delete rest[values[values.length - 1]];
      this.trackMarkers = rest;
    },
    resetTrackMarkers(): void {
      this.trackMarkers = {};
    },
    copyTrackPositions(): void {
      navigator.clipboard?.writeText(this.trackPositionsCode);
    },
  },
});
</script>

<style scoped lang="less">
.simple-map-editor {
  padding: 20px;
  color: #ddd;

  h1 { color: #fff; }
  .simple-map-editor-board-nav {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    a {
      color: #cfc9e6;
      font-size: 13px;
      text-decoration: underline;
      &:hover { color: #fff; }
    }
  }
  .simple-map-editor-note { font-size: 12px; color: #999; max-width: 640px; }

  .simple-map-editor-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .simple-map-editor-controls {
    width: 260px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .simple-map-editor-field {
    display: flex;
    align-items: center;
    gap: 8px;
    input[type=text] { flex: 1; }
  }

  fieldset {
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px;
    legend { padding: 0 4px; }
    label { display: block; font-size: 13px; }
  }

  .simple-map-editor-tools label {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 1px 0;
    cursor: help;
  }
  .simple-map-editor-tools-note {
    margin: 2px 0 6px;
    font-size: 11px;
    color: #999;
  }
  .simple-map-editor-tool-hint {
    min-height: 30px;
    margin: 0;
    padding: 6px 8px;
    font-size: 12px;
    color: #cfc9e6;
    background: #2a2733;
    border-radius: 4px;
  }

  .simple-map-editor-swatch {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    flex: 0 0 16px;
  }
  .simple-map-editor-swatch--land { background: #8a6d3b; }
  .simple-map-editor-swatch--lunar_mine { background: #6b6b78; }
  .simple-map-editor-swatch--gaslight { background: #e6be28; }
  .simple-map-editor-swatch--stratopolis { background: #4aa8ff; }
  .simple-map-editor-swatch--maxwellBase { background: #ff6b4a; }
  .simple-map-editor-swatch--clear-reserved {
    background: transparent;
    border: 1px dashed #999;
    box-sizing: border-box;
    font-style: normal;
    font-size: 10px;
    line-height: 14px;
    text-align: center;
    color: #e74c3c;
  }
  .simple-map-editor-swatch--void {
    background: repeating-linear-gradient(45deg, #2a2733, #2a2733 4px, #15131f 4px, #15131f 8px);
    border: 1px dashed #666;
    box-sizing: border-box;
    font-style: normal;
    font-size: 10px;
    line-height: 14px;
    text-align: center;
    color: #666;
  }

  .simple-map-editor-bonus-icon {
    display: inline-block;
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    background-repeat: no-repeat !important;
    background-position: center !important;
    background-size: contain !important;
  }
  .simple-map-editor-bonus-icon--clear {
    font-style: normal;
    font-size: 16px;
    line-height: 20px;
    text-align: center;
    color: #e74c3c;
  }

  .simple-map-editor-canvas {
    flex: 1;
    min-width: 420px;
  }

  .simple-map-editor-grid-wrap {
    display: flex;
    justify-content: center;
    background: #15131f;
    border-radius: 6px;
    overflow: auto;
    max-height: 60vh;
    padding: 20px;
  }
  .simple-map-editor-grid {
    position: relative;
    flex: 0 0 auto;
  }

  .simple-map-editor-hex {
    position: absolute;
    width: 46px;
    height: 51px;
    border: none;
    padding: 0;
    cursor: pointer;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    &:hover { filter: brightness(1.25); }
  }

  .simple-map-editor-hex-bonuses {
    display: flex;
    flex-wrap: wrap;
    place-content: center;
    gap: 1px;
    width: 100%;
    height: 100%;
  }
  .simple-map-editor-hex-bonus {
    display: inline-block;
    width: 13px;
    height: 13px;
    background-repeat: no-repeat !important;
    background-position: center !important;
    background-size: contain !important;
  }

  .simple-map-editor-code {
    display: block;
    margin-top: 12px;
    textarea { width: 100%; font-family: monospace; }
  }

  .simple-map-editor-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
    .simple-map-editor-load-input { flex: 1; min-width: 160px; }
    .simple-map-editor-play { margin-left: auto; font-weight: bold; }
  }

  .simple-map-editor-error { color: #e74c3c; margin-top: 6px; }

  .simple-map-editor-export {
    margin-top: 12px;
    textarea { width: 100%; font-family: monospace; margin-top: 6px; }
  }

  .simple-map-editor-preview {
    margin-top: 24px;
    h3 { color: #fff; }
  }
  .simple-map-editor-backdrop-tools {
    max-width: 480px;
    .simple-map-editor-actions { margin-top: 6px; }
  }
  .simple-map-editor-backdrop-scale {
    display: flex;
    align-items: center;
    gap: 8px;
    input[type=range] { flex: 1; }
  }
  .simple-map-editor-preview-zoom {
    position: relative;
    zoom: 1.6;
    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
  }
  .simple-map-editor-backdrop-drag {
    cursor: grab;
    user-select: none;
    &--active { cursor: grabbing; }
  }

  .simple-map-editor-track-next {
    margin: 0 0 8px;
    font-size: 13px;
    strong { color: #fff; }
  }
  .simple-map-editor-track-calibrate {
    cursor: crosshair;
    user-select: none;
  }
  .simple-map-editor-track-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    min-width: 14px;
    padding: 0 3px;
    line-height: 14px;
    font-size: 10px;
    text-align: center;
    color: #000;
    background: #fff;
    border: 1px solid #000;
    border-radius: 3px;
    pointer-events: none;
  }
}
@media (max-width: 700px) {
  .simple-map-editor {
    padding: 12px;
    .simple-map-editor-controls,
    .simple-map-editor-canvas { width: 100%; min-width: 0; }
    .simple-map-editor-board-nav { flex-wrap: wrap; }
    .simple-map-editor-field input { min-width: 0; max-width: 100%; }
    .simple-map-editor-grid-wrap { justify-content: flex-start; }
    .simple-map-editor-preview { max-width: 100%; overflow-x: auto; }
    textarea { box-sizing: border-box; max-width: 100%; }
  }
}
</style>
