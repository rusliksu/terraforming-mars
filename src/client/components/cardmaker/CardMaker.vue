<template>
  <div class="card-maker">
    <h1 v-i18n>Custom Card Maker</h1>
    <p class="card-maker-intro" v-i18n>
      Build a real, playable card: name it, tag it, cost it, give it a requirement and an effect,
      then compose its icons from the real icon set. Submit it for review — once an admin approves
      it, it becomes available in any game with "Custom Cards" enabled.
    </p>
    <p class="card-maker-intro"><a :href="paths.CARD_LIBRARY" v-i18n>Browse submitted &amp; approved cards</a></p>

    <div class="card-maker-layout">
      <div class="card-maker-controls">

        <fieldset class="card-maker-fieldset">
          <legend v-i18n>Basics</legend>
          <label class="card-maker-field">
            <span v-i18n>Name</span>
            <input type="text" v-model="cardName" :maxlength="MAX_CUSTOM_CARD_NAME_LENGTH" placeholder="Card name">
          </label>
          <label class="card-maker-field">
            <span v-i18n>Type</span>
            <select v-model="type">
              <option v-for="t in CUSTOM_CARD_TYPES" :key="t" :value="t">{{ typeLabel(t) }}</option>
            </select>
          </label>
          <label class="card-maker-field">
            <span v-i18n>Cost</span>
            <input type="number" v-model.number="cost" :min="MIN_CUSTOM_CARD_COST" :max="MAX_CUSTOM_CARD_COST">
          </label>
          <label class="card-maker-field card-maker-field--inline">
            <input type="checkbox" v-model="hasVictoryPoints">
            <span v-i18n>Worth victory points</span>
            <input v-if="hasVictoryPoints" type="number" v-model.number="victoryPointsInput" min="-5" max="10">
          </label>
          <label class="card-maker-field">
            <span v-i18n>Description (flavor text)</span>
            <textarea rows="2" v-model="description" :maxlength="MAX_CUSTOM_CARD_DESCRIPTION_LENGTH"></textarea>
          </label>
          <label class="card-maker-field">
            <span v-i18n>Self-stored resource type</span>
            <select v-model="resourceTypeInput">
              <option value="">(none)</option>
              <option v-for="r in ALL_CARD_RESOURCES" :key="r" :value="r">{{ r }}</option>
            </select>
          </label>
          <p class="card-maker-note" v-i18n>Only meaningful for an Active card with an "add resources to this card" effect below.</p>
        </fieldset>

        <fieldset class="card-maker-fieldset">
          <legend>{{ 'Tags (max ' + MAX_CUSTOM_CARD_TAGS + ' total -- duplicates allowed)' }}</legend>
          <div v-for="t in pickableTags" :key="t" class="card-maker-tag-stepper">
            <span class="card-maker-tag-stepper-label">{{ t }}</span>
            <button type="button" @click="removeTag(t)" :disabled="tagCount(t) === 0" title="Remove one">−</button>
            <span class="card-maker-tag-stepper-count">{{ tagCount(t) }}</span>
            <button type="button" @click="addTag(t)" :disabled="tags.length >= MAX_CUSTOM_CARD_TAGS" title="Add one">+</button>
          </div>
        </fieldset>

        <fieldset class="card-maker-fieldset">
          <legend v-i18n>Expansion compatibility</legend>
          <p class="card-maker-note" v-i18n>Which expansions must also be enabled for this card to appear in a game's pool. Leave empty for a base-compatible card that appears in every game with Custom Cards enabled.</p>
          <label v-for="e in pickableExpansions" :key="e" class="card-maker-check">
            <input type="checkbox" :value="e" v-model="compatibility">
            <span>{{ MODULE_NAMES[e] }}</span>
          </label>
        </fieldset>

        <fieldset class="card-maker-fieldset">
          <legend>{{ 'Requirements (max ' + MAX_CUSTOM_CARD_REQUIREMENTS + ')' }}</legend>
          <div v-for="(r, i) in requirements" :key="i" class="card-maker-requirement">
            <select v-model="r.kind">
              <option value="oceans" v-i18n>Oceans placed</option>
              <option value="temperature" v-i18n>Temperature</option>
              <option value="oxygen" v-i18n>Oxygen</option>
              <option value="tag" v-i18n>Tag count</option>
              <option value="production" v-i18n>Production level</option>
            </select>
            <select v-if="r.kind === 'tag'" v-model="r.tag">
              <option v-for="t in pickableTags" :key="t" :value="t">{{ t }}</option>
            </select>
            <select v-if="r.kind === 'production'" v-model="r.resource">
              <option v-for="res in ALL_RESOURCES" :key="res" :value="res">{{ res }}</option>
            </select>
            <input type="number" v-model.number="r.count" :min="requirementMin(r.kind)" :max="requirementMax(r.kind)">
            <label class="card-maker-check card-maker-check--inline">
              <input type="checkbox" v-model="r.max">
              <span v-i18n>at most (instead of at least)</span>
            </label>
            <button type="button" @click="requirements.splice(i, 1)" title="Remove requirement">✕</button>
          </div>
          <button type="button" :disabled="requirements.length >= MAX_CUSTOM_CARD_REQUIREMENTS" @click="requirements.push(blankRequirement())" v-i18n>+ Requirement</button>
        </fieldset>

        <fieldset class="card-maker-fieldset">
          <legend v-i18n>Effect</legend>
          <p class="card-maker-note" v-i18n>Toggle any curated effect blocks below, and/or describe the effect in plain text. At least one is required before this card can be approved.</p>

          <label class="card-maker-check">
            <input type="checkbox" v-model="fx.useStock">
            <span v-i18n>Gain/lose stock resources on play</span>
          </label>
          <div v-if="fx.useStock" class="card-maker-units">
            <label v-for="res in ALL_RESOURCES" :key="res">{{ res }}
              <input type="number" v-model.number="fx.stock[res]">
            </label>
          </div>

          <label class="card-maker-check">
            <input type="checkbox" v-model="fx.useProduction">
            <span v-i18n>Gain/lose production on play</span>
          </label>
          <div v-if="fx.useProduction" class="card-maker-units">
            <label v-for="res in ALL_RESOURCES" :key="res">{{ res }}
              <input type="number" v-model.number="fx.production[res]">
            </label>
          </div>

          <label class="card-maker-check card-maker-check--inline">
            <input type="checkbox" v-model="fx.useStandardResource">
            <span v-i18n>Gain</span>
            <input v-if="fx.useStandardResource" type="number" v-model.number="fx.standardResourceCount" min="1" max="20">
            <span v-if="fx.useStandardResource" v-i18n>standard resource(s) of your choice</span>
          </label>

          <label class="card-maker-check card-maker-check--inline">
            <input type="checkbox" v-model="fx.useDrawCard">
            <span v-i18n>Draw</span>
            <input v-if="fx.useDrawCard" type="number" v-model.number="fx.drawCardCount" min="1" max="10">
            <span v-if="fx.useDrawCard" v-i18n>card(s)</span>
          </label>

          <label class="card-maker-check card-maker-check--inline">
            <input type="checkbox" v-model="fx.useAddResources">
            <span v-i18n>Add</span>
            <input v-if="fx.useAddResources" type="number" v-model.number="fx.addResourcesCount" min="1" max="10">
            <span v-if="fx.useAddResources" v-i18n>resource(s) to this card itself</span>
          </label>

          <label class="card-maker-check">
            <input type="checkbox" v-model="fx.useGlobal">
            <span v-i18n>Raise/lower a global parameter</span>
          </label>
          <div v-if="fx.useGlobal" class="card-maker-globals">
            <label>{{ 'Temperature' }}
              <select v-model.number="fx.temperature">
                <option :value="undefined">—</option>
                <option v-for="s in TEMPERATURE_STEPS" :key="s" :value="s">{{ s > 0 ? '+' + s : s }}</option>
              </select>
            </label>
            <label>{{ 'Oxygen' }}
              <select v-model.number="fx.oxygen">
                <option :value="undefined">—</option>
                <option v-for="s in OXYGEN_STEPS" :key="s" :value="s">{{ s > 0 ? '+' + s : s }}</option>
              </select>
            </label>
            <label>{{ 'Venus' }}
              <select v-model.number="fx.venus">
                <option :value="undefined">—</option>
                <option v-for="s in VENUS_STEPS" :key="s" :value="s">{{ s > 0 ? '+' + s : s }}</option>
              </select>
            </label>
          </div>

          <label class="card-maker-check">
            <input type="checkbox" v-model="fx.usePlacement">
            <span v-i18n>Place a tile</span>
          </label>
          <div v-if="fx.usePlacement" class="card-maker-placement">
            <select v-model="fx.placementTile">
              <option value="city" v-i18n>City</option>
              <option value="greenery" v-i18n>Greenery</option>
              <option value="ocean" v-i18n>Ocean</option>
            </select>
            <span v-i18n>on</span>
            <select v-model="fx.placementOn">
              <option value="">{{ '(no restriction)' }}</option>
              <option v-for="p in PLACEMENT_TYPES" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>

          <label class="card-maker-field">
            <span v-i18n>Effect description (free text)</span>
            <textarea rows="2" v-model="effectDescription" :maxlength="MAX_CUSTOM_CARD_EFFECT_DESCRIPTION_LENGTH" placeholder="Required if no curated effect block above is used."></textarea>
          </label>
        </fieldset>

        <fieldset class="card-maker-fieldset">
          <legend>{{ 'Icons (max ' + MAX_CUSTOM_CARD_RENDER_ROWS + ' rows of ' + MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW + ')' }}</legend>
          <p class="card-maker-note" v-i18n>Drag an icon by its ⠿ handle to reorder it within a row, or drop it on another row to move it there.</p>
          <div v-for="(row, ri) in rows" :key="ri" class="card-maker-row">
            <div class="card-maker-row-header">
              <strong>{{ 'Row ' + (ri + 1) }}</strong>
              <button type="button" @click="removeRow(ri)" title="Remove row">✕ row</button>
            </div>
            <div class="card-maker-row-items" @dragover.prevent @drop="onChipDrop(ri, row.length)">
              <span
                v-for="(item, ii) in row" :key="ii" class="card-maker-chip"
                draggable="true"
                @dragstart="onChipDragStart(ri, ii)"
                @dragend="onChipDragEnd"
                @dragover.prevent
                @drop.stop="onChipDrop(ri, ii)"
              >
                <span class="card-maker-chip-handle" title="Drag to reorder">⠿</span>
                {{ itemLabel(item) }}
                <button type="button" @click="row.splice(ii, 1)" title="Remove icon">✕</button>
              </span>
              <span v-if="row.length === 0" class="card-maker-note">{{ '(empty row -- drag icons here)' }}</span>
            </div>
            <div class="card-maker-add-item">
              <select v-model="rowDrafts[ri].kind">
                <option value="item" v-i18n>Resource/param icon</option>
                <option value="symbol" v-i18n>Symbol</option>
                <option value="tile" v-i18n>Tile</option>
                <option value="text" v-i18n>Text</option>
              </select>

              <template v-if="rowDrafts[ri].kind === 'item'">
                <select v-model="rowDrafts[ri].itemType">
                  <option v-for="t in CURATED_ITEM_TYPES" :key="t" :value="t">{{ t }}</option>
                </select>
                <input type="number" v-model.number="rowDrafts[ri].amount" min="0" max="20" title="Amount">
                <select v-model="rowDrafts[ri].size">
                  <option v-for="s in SIZES" :key="s" :value="s">{{ s }}</option>
                </select>
                <select v-if="rowDrafts[ri].itemType === CardRenderItemType.TAG" v-model="rowDrafts[ri].tag">
                  <option v-for="t in pickableTags" :key="t" :value="t">{{ t }}</option>
                </select>
                <select v-if="rowDrafts[ri].itemType === CardRenderItemType.RESOURCE" v-model="rowDrafts[ri].resource">
                  <option v-for="r in ALL_CARD_RESOURCES" :key="r" :value="r">{{ r }}</option>
                </select>
                <label class="card-maker-check--inline" :title="'Show the amount as a small digit instead of repeating the icon.'">
                  <input type="checkbox" v-model="rowDrafts[ri].showDigit"><span v-i18n>digit</span>
                </label>
                <label class="card-maker-check--inline" :title="'Show the amount inside the icon (used for M€).'">
                  <input type="checkbox" v-model="rowDrafts[ri].amountInside"><span v-i18n>inside</span>
                </label>
              </template>

              <template v-else-if="rowDrafts[ri].kind === 'symbol'">
                <select v-model="rowDrafts[ri].symbolType">
                  <option v-for="t in CURATED_SYMBOL_TYPES" :key="t" :value="t">{{ symbolLabel(t) }}</option>
                </select>
              </template>

              <template v-else-if="rowDrafts[ri].kind === 'tile'">
                <select v-model.number="rowDrafts[ri].tile">
                  <option v-for="t in CURATED_TILE_TYPES" :key="t" :value="t">{{ TileType[t] }}</option>
                </select>
              </template>

              <template v-else>
                <input type="text" v-model="rowDrafts[ri].text" :maxlength="MAX_CUSTOM_CARD_RENDER_TEXT_LENGTH" placeholder="Short label">
              </template>

              <button type="button" :disabled="row.length >= MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW" @click="addItemToRow(ri)" v-i18n>+ Add</button>
            </div>
          </div>
          <button type="button" :disabled="rows.length >= MAX_CUSTOM_CARD_RENDER_ROWS" @click="addRow" v-i18n>+ Row</button>
        </fieldset>

        <fieldset class="card-maker-fieldset">
          <legend v-i18n>Share &amp; submit</legend>
          <label class="card-maker-field">
            <span v-i18n>Card code</span>
            <textarea readonly rows="3" :value="code" @focus="($event.target as HTMLTextAreaElement).select()"></textarea>
          </label>
          <div class="card-maker-actions">
            <button type="button" @click="copyCode" v-i18n>Copy code</button>
            <button type="button" @click="newCard" v-i18n>New card</button>
          </div>
          <label class="card-maker-field">
            <input type="text" v-model="loadInput" placeholder="Paste a TMC1… code" class="card-maker-load-input">
            <button type="button" @click="loadCode" v-i18n>Load</button>
          </label>
          <div v-if="loadError" class="card-maker-error">{{ loadError }}</div>
          <div v-if="loadWarning" class="card-maker-warning">⚠ {{ loadWarning }}</div>

          <div v-if="warnings.length" class="card-maker-warnings">
            <div v-for="(w, i) in warnings" :key="i">⚠ {{ w }}</div>
          </div>

          <label class="card-maker-field">
            <span v-i18n>Submitted by</span>
            <input type="text" v-model="submittedBy" :maxlength="MAX_CUSTOM_CARD_SUBMITTED_BY_LENGTH">
          </label>
          <div v-if="submitError" class="card-maker-error">{{ submitError }}</div>
          <div v-if="submittedEntry" class="card-maker-success">
            {{ 'Submitted for review (id ' + submittedEntry.id + ').' }}
          </div>
          <button type="button" class="card-maker-submit" :disabled="submitting || cardName.trim() === ''" @click="submit" v-i18n>
            Submit card
          </button>
        </fieldset>
      </div>

      <div class="card-maker-preview">
        <h3 v-i18n>Preview</h3>
        <div class="card-maker-preview-zoom">
          <Card :card="previewCardModel" :key="previewKey" auto-tall/>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import Card from '@/client/components/card/Card.vue';
import {CardModel, CustomCardModel} from '@/common/models/CardModel';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Tag, ALL_TAGS} from '@/common/cards/Tag';
import {Resource, ALL_RESOURCES} from '@/common/Resource';
import {CardResource} from '@/common/CardResource';
import {TileType} from '@/common/TileType';
import {Expansion, EXPANSIONS, MODULE_NAMES} from '@/common/cards/GameModule';
import {CardRequirementDescriptor} from '@/common/cards/CardRequirementDescriptor';
import {CardRenderItemType} from '@/common/cards/render/CardRenderItemType';
import {CardRenderSymbolType} from '@/common/cards/render/CardRenderSymbolType';
import {Size} from '@/common/cards/render/Size';
import {ICardRenderItem, ICardRenderRoot, ICardRenderSymbol, ICardRenderTile, ItemType} from '@/common/cards/render/Types';
import {
  CustomCardDefinition,
  CustomCardType,
  CUSTOM_CARD_TYPES,
  UncheckedBehavior,
  MAX_CUSTOM_CARD_NAME_LENGTH,
  MAX_CUSTOM_CARD_DESCRIPTION_LENGTH,
  MAX_CUSTOM_CARD_EFFECT_DESCRIPTION_LENGTH,
  MAX_CUSTOM_CARD_TAGS,
  MAX_CUSTOM_CARD_REQUIREMENTS,
  MAX_CUSTOM_CARD_RENDER_ROWS,
  MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW,
  MIN_CUSTOM_CARD_COST,
  MAX_CUSTOM_CARD_COST,
} from '@/common/cards/CustomCardDefinition';
import {CustomCardCodecError, decodeCustomCard, encodeCustomCard, validateCustomCard} from '@/common/cards/customCardCodec';
import {isCuratedBehavior} from '@/common/cards/curatedBehaviorTemplates';
import {MAX_CUSTOM_CARD_RENDER_TEXT_LENGTH} from '@/common/cards/curatedCardRenderData';
import {CustomCardLibraryEntry, MAX_CUSTOM_CARD_SUBMITTED_BY_LENGTH} from '@/common/cards/CustomCardLibraryEntry';
import {paths} from '@/common/app/paths';

// The bounded palette this composer exposes -- kept in lockstep with curatedCardRenderData.ts's
// server-side whitelist so nothing built here can ever be rejected on submit.
const CURATED_ITEM_TYPES: ReadonlyArray<CardRenderItemType> = [
  CardRenderItemType.MEGACREDITS, CardRenderItemType.STEEL, CardRenderItemType.TITANIUM,
  CardRenderItemType.PLANTS, CardRenderItemType.ENERGY, CardRenderItemType.HEAT,
  CardRenderItemType.TEMPERATURE, CardRenderItemType.OXYGEN, CardRenderItemType.OCEANS, CardRenderItemType.VENUS,
  CardRenderItemType.TR, CardRenderItemType.CARDS, CardRenderItemType.WILD,
  CardRenderItemType.CITY, CardRenderItemType.GREENERY, CardRenderItemType.VP,
  CardRenderItemType.TAG, CardRenderItemType.RESOURCE, CardRenderItemType.NBSP,
];
const CURATED_SYMBOL_TYPES: ReadonlyArray<CardRenderSymbolType> = [
  CardRenderSymbolType.PLUS, CardRenderSymbolType.MINUS, CardRenderSymbolType.ARROW,
  CardRenderSymbolType.COLON, CardRenderSymbolType.SLASH, CardRenderSymbolType.OR,
  CardRenderSymbolType.BRACKET_OPEN, CardRenderSymbolType.BRACKET_CLOSE,
  CardRenderSymbolType.EQUALS, CardRenderSymbolType.ASTERIX, CardRenderSymbolType.EMPTY, CardRenderSymbolType.NBSP,
];
const CURATED_TILE_TYPES: ReadonlyArray<TileType> = [TileType.CITY, TileType.GREENERY, TileType.OCEAN];
// Mirrors CardRenderSymbol.ts's server-side factory: these symbols are drawn as a graphic
// (isIcon:true) rather than their literal text (e.g. an arrow icon, not the string "->").
// Getting this wrong is exactly the "arrow renders as both the graphic AND weird text" bug.
const SYMBOL_IS_ICON: ReadonlySet<CardRenderSymbolType> = new Set([
  CardRenderSymbolType.PLUS, CardRenderSymbolType.MINUS, CardRenderSymbolType.ARROW, CardRenderSymbolType.NBSP,
]);
const SYMBOL_IS_SUPERSCRIPT: ReadonlySet<CardRenderSymbolType> = new Set([
  CardRenderSymbolType.BRACKET_OPEN, CardRenderSymbolType.BRACKET_CLOSE,
]);
// Tags that only make sense alongside a specific expansion -- adding one of these for the
// first time auto-enables that expansion's compatibility checkbox, and removing its last
// instance auto-disables it again (unless another present tag still implies the same one).
const TAG_IMPLIES_EXPANSION: Partial<Record<Tag, Expansion>> = {
  [Tag.CRIME]: 'underworld',
  [Tag.MOON]: 'moon',
  [Tag.MARS]: 'pathfinders',
  [Tag.VENUS]: 'venus',
};
const SIZES: ReadonlyArray<Size> = [Size.TINY, Size.SMALL, Size.MEDIUM, Size.LARGE];
const ALL_CARD_RESOURCES: ReadonlyArray<CardResource> = Object.values(CardResource);
const PLACEMENT_TYPES: ReadonlyArray<string> = ['land', 'ocean', 'greenery', 'city'];
const TEMPERATURE_STEPS: ReadonlyArray<number> = [-2, -1, 1, 2, 3];
const OXYGEN_STEPS: ReadonlyArray<number> = [-2, -1, 1, 2];
const VENUS_STEPS: ReadonlyArray<number> = [-1, 1, 2, 3];

type RequirementKind = 'oceans' | 'temperature' | 'oxygen' | 'tag' | 'production';
type RequirementRow = {kind: RequirementKind, count: number, max: boolean, tag: Tag, resource: Resource};

type ComposerItem =
  | {kind: 'text', text: string}
  | {kind: 'symbol', type: CardRenderSymbolType, size: Size}
  | {kind: 'tile', tile: TileType}
  | {kind: 'item', type: CardRenderItemType, amount: number, size: Size, tag?: Tag, resource?: CardResource, showDigit?: boolean, amountInside?: boolean};

type ComposerDraft = {
  kind: 'item' | 'symbol' | 'tile' | 'text',
  itemType: CardRenderItemType,
  amount: number,
  size: Size,
  tag: Tag,
  resource: CardResource,
  showDigit: boolean,
  amountInside: boolean,
  symbolType: CardRenderSymbolType,
  tile: TileType,
  text: string,
};

type FxState = {
  useStock: boolean, stock: Record<Resource, number | undefined>,
  useProduction: boolean, production: Record<Resource, number | undefined>,
  useStandardResource: boolean, standardResourceCount: number,
  useDrawCard: boolean, drawCardCount: number,
  useAddResources: boolean, addResourcesCount: number,
  useGlobal: boolean, temperature: number | undefined, oxygen: number | undefined, venus: number | undefined,
  usePlacement: boolean, placementTile: 'city' | 'greenery' | 'ocean', placementOn: string,
};

function blankUnits(): Record<Resource, number | undefined> {
  return {megacredits: undefined, steel: undefined, titanium: undefined, plants: undefined, energy: undefined, heat: undefined};
}

function blankFx(): FxState {
  return {
    useStock: false, stock: blankUnits(),
    useProduction: false, production: blankUnits(),
    useStandardResource: false, standardResourceCount: 1,
    useDrawCard: false, drawCardCount: 1,
    useAddResources: false, addResourcesCount: 1,
    useGlobal: false, temperature: undefined, oxygen: undefined, venus: undefined,
    usePlacement: false, placementTile: 'city', placementOn: '',
  };
}

function blankRequirement(): RequirementRow {
  return {kind: 'oceans', count: 3, max: false, tag: Tag.SPACE, resource: Resource.STEEL};
}

function blankDraft(): ComposerDraft {
  return {
    kind: 'item', itemType: CardRenderItemType.MEGACREDITS, amount: 1, size: Size.MEDIUM,
    tag: Tag.SPACE, resource: CardResource.MICROBE, showDigit: false, amountInside: false,
    symbolType: CardRenderSymbolType.ARROW, tile: TileType.CITY, text: '',
  };
}

export default defineComponent({
  name: 'CardMaker',
  components: {Card},
  data() {
    return {
      cardName: '',
      type: CardType.AUTOMATED as CustomCardType,
      tags: [] as Array<Tag>,
      compatibility: [] as Array<Expansion>,
      cost: 8,
      hasVictoryPoints: false,
      victoryPointsInput: 1,
      description: '',
      resourceTypeInput: '' as CardResource | '',

      requirements: [] as Array<RequirementRow>,

      fx: blankFx(),
      effectDescription: '',

      rows: [[]] as Array<Array<ComposerItem>>,
      rowDrafts: [blankDraft()] as Array<ComposerDraft>,
      dragSource: null as {row: number, index: number} | null,

      loadInput: '',
      loadError: '',
      loadWarning: '',
      submittedBy: '',
      submitting: false,
      submitError: '',
      submittedEntry: undefined as CustomCardLibraryEntry | undefined,
    };
  },
  computed: {
    paths: () => paths,
    MAX_CUSTOM_CARD_NAME_LENGTH: () => MAX_CUSTOM_CARD_NAME_LENGTH,
    MAX_CUSTOM_CARD_DESCRIPTION_LENGTH: () => MAX_CUSTOM_CARD_DESCRIPTION_LENGTH,
    MAX_CUSTOM_CARD_EFFECT_DESCRIPTION_LENGTH: () => MAX_CUSTOM_CARD_EFFECT_DESCRIPTION_LENGTH,
    MAX_CUSTOM_CARD_TAGS: () => MAX_CUSTOM_CARD_TAGS,
    MAX_CUSTOM_CARD_REQUIREMENTS: () => MAX_CUSTOM_CARD_REQUIREMENTS,
    MAX_CUSTOM_CARD_RENDER_ROWS: () => MAX_CUSTOM_CARD_RENDER_ROWS,
    MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW: () => MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW,
    MAX_CUSTOM_CARD_RENDER_TEXT_LENGTH: () => MAX_CUSTOM_CARD_RENDER_TEXT_LENGTH,
    MAX_CUSTOM_CARD_SUBMITTED_BY_LENGTH: () => MAX_CUSTOM_CARD_SUBMITTED_BY_LENGTH,
    MIN_CUSTOM_CARD_COST: () => MIN_CUSTOM_CARD_COST,
    MAX_CUSTOM_CARD_COST: () => MAX_CUSTOM_CARD_COST,
    CUSTOM_CARD_TYPES: () => CUSTOM_CARD_TYPES,
    ALL_RESOURCES: () => ALL_RESOURCES,
    ALL_CARD_RESOURCES: () => ALL_CARD_RESOURCES,
    CURATED_ITEM_TYPES: () => CURATED_ITEM_TYPES,
    CURATED_SYMBOL_TYPES: () => CURATED_SYMBOL_TYPES,
    CURATED_TILE_TYPES: () => CURATED_TILE_TYPES,
    SIZES: () => SIZES,
    PLACEMENT_TYPES: () => PLACEMENT_TYPES,
    TEMPERATURE_STEPS: () => TEMPERATURE_STEPS,
    OXYGEN_STEPS: () => OXYGEN_STEPS,
    VENUS_STEPS: () => VENUS_STEPS,
    MODULE_NAMES: () => MODULE_NAMES,
    CardRenderItemType: () => CardRenderItemType,
    TileType: () => TileType,

    pickableTags(): ReadonlyArray<Tag> {
      return ALL_TAGS.filter((t) => t !== Tag.EVENT && t !== Tag.CLONE);
    },
    pickableExpansions(): ReadonlyArray<Expansion> {
      return EXPANSIONS.filter((e) => e !== 'customCards');
    },

    behavior(): UncheckedBehavior | undefined {
      const b: UncheckedBehavior = {};
      if (this.fx.useStock) {
        const stock = this.nonZeroUnits(this.fx.stock);
        if (stock !== undefined) {
          b.stock = stock;
        }
      }
      if (this.fx.useProduction) {
        const production = this.nonZeroUnits(this.fx.production);
        if (production !== undefined) {
          b.production = production;
        }
      }
      if (this.fx.useStandardResource && this.fx.standardResourceCount > 0) {
        b.standardResource = this.fx.standardResourceCount;
      }
      if (this.fx.useDrawCard && this.fx.drawCardCount > 0) {
        b.drawCard = this.fx.drawCardCount;
      }
      if (this.fx.useAddResources && this.fx.addResourcesCount > 0) {
        b.addResources = this.fx.addResourcesCount;
      }
      if (this.fx.useGlobal) {
        const global: Record<string, number> = {};
        if (this.fx.temperature !== undefined) {
          global.temperature = this.fx.temperature;
        }
        if (this.fx.oxygen !== undefined) {
          global.oxygen = this.fx.oxygen;
        }
        if (this.fx.venus !== undefined) {
          global.venus = this.fx.venus;
        }
        if (Object.keys(global).length > 0) {
          b.global = global;
        }
      }
      if (this.fx.usePlacement) {
        const placement: Record<string, unknown> = {};
        if (this.fx.placementOn !== '') {
          placement.on = this.fx.placementOn;
        }
        b[this.fx.placementTile] = placement;
      }
      return Object.keys(b).length > 0 ? b : undefined;
    },

    requirementDescriptors(): Array<CardRequirementDescriptor> {
      return this.requirements.map((r): CardRequirementDescriptor => {
        const base: CardRequirementDescriptor = {};
        if (r.max) {
          base.max = true;
        }
        switch (r.kind) {
        case 'oceans': base.oceans = r.count; break;
        case 'temperature': base.temperature = r.count; break;
        case 'oxygen': base.oxygen = r.count; break;
        case 'tag': base.tag = r.tag; base.count = r.count; break;
        case 'production': base.production = r.resource; base.count = r.count; break;
        }
        return base;
      });
    },

    renderData(): ICardRenderRoot {
      return {
        is: 'root',
        rows: this.rows.map((row) => row.map((item) => this.toRenderItem(item))),
      };
    },

    definition(): CustomCardDefinition {
      const def: CustomCardDefinition = {
        cardName: this.cardName.trim(),
        type: this.type,
        tags: this.tags,
        compatibility: this.compatibility,
        cost: this.cost,
        requirements: this.requirementDescriptors,
        description: this.description,
        renderData: this.renderData,
      };
      if (this.hasVictoryPoints) {
        def.victoryPoints = this.victoryPointsInput;
      }
      if (this.resourceTypeInput !== '') {
        def.resourceType = this.resourceTypeInput;
      }
      const behavior = this.behavior;
      if (behavior !== undefined) {
        def.behavior = behavior;
      }
      if (this.effectDescription.trim() !== '') {
        def.effectDescription = this.effectDescription.trim();
      }
      return def;
    },

    code(): string {
      return encodeCustomCard(this.definition);
    },

    warnings(): Array<string> {
      return validateCustomCard(this.definition);
    },

    previewCardModel(): CardModel {
      const customCard: CustomCardModel = {
        type: this.type,
        cost: this.cost,
        tags: this.tags,
        requirements: this.requirementDescriptors,
        metadata: {
          description: this.description,
          renderData: this.renderData,
          victoryPoints: this.hasVictoryPoints ? this.victoryPointsInput : undefined,
        },
        resourceType: this.resourceTypeInput === '' ? undefined : this.resourceTypeInput,
        module: 'customCards',
        compatibility: this.compatibility,
      };
      return {
        name: (this.cardName.trim() || 'Untitled Card') as CardName,
        customCard,
      };
    },

    previewKey(): string {
      // Card.vue resolves its face-of-card data once in data(), so force a remount whenever
      // anything that would change the preview changes.
      return JSON.stringify(this.previewCardModel);
    },
  },
  methods: {
    blankRequirement,
    typeLabel(t: CustomCardType): string {
      const labels: Record<CustomCardType, string> = {
        [CardType.AUTOMATED]: 'Automated (plays immediately)',
        [CardType.ACTIVE]: 'Active (has a repeatable action)',
        [CardType.EVENT]: 'Event (one-time, discarded after use)',
      };
      return labels[t];
    },
    symbolLabel(t: CardRenderSymbolType): string {
      return t === CardRenderSymbolType.EMPTY ? '(space)' : t;
    },
    requirementMin(kind: RequirementKind): number {
      return kind === 'temperature' ? -30 : 0;
    },
    requirementMax(kind: RequirementKind): number {
      switch (kind) {
      case 'oceans': return 9;
      case 'temperature': return 8;
      case 'oxygen': return 14;
      default: return 20;
      }
    },
    tagCount(t: Tag): number {
      return this.tags.filter((x) => x === t).length;
    },
    addTag(t: Tag): void {
      if (this.tags.length >= MAX_CUSTOM_CARD_TAGS) {
        return;
      }
      const isFirst = !this.tags.includes(t);
      this.tags.push(t);
      if (isFirst) {
        const requiredExpansion = TAG_IMPLIES_EXPANSION[t];
        if (requiredExpansion !== undefined && !this.compatibility.includes(requiredExpansion)) {
          this.compatibility.push(requiredExpansion);
        }
      }
    },
    removeTag(t: Tag): void {
      const idx = this.tags.indexOf(t);
      if (idx >= 0) {
        this.tags.splice(idx, 1);
      }
      // Undo the auto-add from addTag() once this was the last instance of the tag -- but only
      // if no other remaining tag still implies the same expansion (e.g. Moon and Mars both
      // present, only Moon removed: pathfinders' own requirement shouldn't be touched, and
      // nothing here maps to the same expansion twice, but a future mapping might).
      if (!this.tags.includes(t)) {
        const impliedExpansion = TAG_IMPLIES_EXPANSION[t];
        if (impliedExpansion !== undefined && !this.tags.some((other) => TAG_IMPLIES_EXPANSION[other] === impliedExpansion)) {
          const compatIdx = this.compatibility.indexOf(impliedExpansion);
          if (compatIdx >= 0) {
            this.compatibility.splice(compatIdx, 1);
          }
        }
      }
    },
    onChipDragStart(row: number, index: number): void {
      this.dragSource = {row, index};
    },
    onChipDragEnd(): void {
      this.dragSource = null;
    },
    onChipDrop(targetRow: number, targetIndex: number): void {
      const source = this.dragSource;
      this.dragSource = null;
      if (source === null || (source.row === targetRow && source.index === targetIndex)) {
        return;
      }
      const sourceArr = this.rows[source.row];
      const destArr = this.rows[targetRow];
      if (sourceArr === undefined || destArr === undefined) {
        return;
      }
      if (source.row !== targetRow && destArr.length >= MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW) {
        return; // Destination row is full -- leave the dragged icon where it was.
      }
      const [moved] = sourceArr.splice(source.index, 1);
      let insertIndex = targetIndex;
      if (source.row === targetRow && source.index < targetIndex) {
        insertIndex -= 1; // The splice above already shifted everything after it down by one.
      }
      destArr.splice(Math.min(Math.max(insertIndex, 0), destArr.length), 0, moved);
    },
    nonZeroUnits(units: Record<Resource, number | undefined>): Record<string, number> | undefined {
      const out: Record<string, number> = {};
      for (const r of ALL_RESOURCES) {
        const v = units[r];
        if (v !== undefined && v !== 0) {
          out[r] = v;
        }
      }
      return Object.keys(out).length > 0 ? out : undefined;
    },
    toRenderItem(item: ComposerItem): ItemType {
      switch (item.kind) {
      case 'text':
        return item.text;
      case 'symbol': {
        const out: ICardRenderSymbol = {is: 'symbol', type: item.type, size: item.size};
        if (SYMBOL_IS_ICON.has(item.type)) {
          out.isIcon = true;
        }
        if (SYMBOL_IS_SUPERSCRIPT.has(item.type)) {
          out.isSuperscript = true;
        }
        return out;
      }
      case 'tile':
        return {is: 'tile', tile: item.tile} as ICardRenderTile;
      case 'item': {
        const out: ICardRenderItem = {is: 'item', type: item.type, amount: item.amount, size: item.size};
        if (item.showDigit) {
          out.showDigit = true;
        }
        if (item.amountInside) {
          out.amountInside = true;
        }
        if (item.type === CardRenderItemType.TAG && item.tag !== undefined) {
          out.tag = item.tag;
        }
        if (item.type === CardRenderItemType.RESOURCE && item.resource !== undefined) {
          out.resource = item.resource;
        }
        return out;
      }
      }
    },
    itemLabel(item: ComposerItem): string {
      switch (item.kind) {
      case 'text': return `"${item.text}"`;
      case 'symbol': return `symbol ${item.type}`;
      case 'tile': return `tile ${TileType[item.tile]}`;
      case 'item': {
        let label = `${item.type} x${item.amount}`;
        if (item.tag !== undefined) {
          label += ` (${item.tag})`;
        }
        if (item.resource !== undefined) {
          label += ` (${item.resource})`;
        }
        return label;
      }
      }
    },
    addRow(): void {
      if (this.rows.length >= MAX_CUSTOM_CARD_RENDER_ROWS) {
        return;
      }
      this.rows.push([]);
      this.rowDrafts.push(blankDraft());
    },
    removeRow(i: number): void {
      this.rows.splice(i, 1);
      this.rowDrafts.splice(i, 1);
    },
    addItemToRow(rowIndex: number): void {
      const row = this.rows[rowIndex];
      if (row === undefined || row.length >= MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW) {
        return;
      }
      const draft = this.rowDrafts[rowIndex];
      let item: ComposerItem;
      switch (draft.kind) {
      case 'text': {
        const text = draft.text.trim().slice(0, MAX_CUSTOM_CARD_RENDER_TEXT_LENGTH);
        if (text === '') {
          return;
        }
        item = {kind: 'text', text};
        break;
      }
      case 'symbol':
        item = {kind: 'symbol', type: draft.symbolType, size: draft.size};
        break;
      case 'tile':
        item = {kind: 'tile', tile: draft.tile};
        break;
      case 'item':
      default: {
        const amount = Math.max(0, Math.min(20, draft.amount || 0));
        const built: ComposerItem = {kind: 'item', type: draft.itemType, amount, size: draft.size};
        if (draft.showDigit) {
          built.showDigit = true;
        }
        if (draft.amountInside) {
          built.amountInside = true;
        }
        if (draft.itemType === CardRenderItemType.TAG) {
          built.tag = draft.tag;
        }
        if (draft.itemType === CardRenderItemType.RESOURCE) {
          built.resource = draft.resource;
        }
        item = built;
        break;
      }
      }
      row.push(item);
    },
    fromRenderItem(item: ItemType): ComposerItem {
      if (typeof item === 'string') {
        return {kind: 'text', text: item.slice(0, MAX_CUSTOM_CARD_RENDER_TEXT_LENGTH)};
      }
      if (item !== undefined && item.is === 'symbol') {
        const s = item as ICardRenderSymbol;
        return {kind: 'symbol', type: s.type, size: s.size ?? Size.MEDIUM};
      }
      if (item !== undefined && item.is === 'tile') {
        const t = item as ICardRenderTile;
        return {kind: 'tile', tile: t.tile};
      }
      if (item !== undefined && item.is === 'item') {
        const i = item as ICardRenderItem;
        return {
          kind: 'item', type: i.type, amount: i.amount, size: i.size ?? Size.MEDIUM,
          tag: i.tag, resource: i.resource,
          showDigit: i.showDigit === true, amountInside: i.amountInside === true,
        };
      }
      // Anything outside the composer's own vocabulary (e.g. an admin-hand-edited card) can't be
      // round-tripped into the editor -- shown as an inert placeholder rather than dropped silently.
      return {kind: 'text', text: '?'};
    },
    applyBehaviorToCurated(behavior: UncheckedBehavior | undefined): void {
      this.fx = blankFx();
      if (behavior === undefined) {
        return;
      }
      if (!isCuratedBehavior(behavior)) {
        this.loadWarning = 'This card\'s effect uses an advanced, admin-set behavior the curated builder can\'t edit -- only its free-text description (if any) was loaded. Re-submitting will need a new curated effect.';
        return;
      }
      const b = behavior as Record<string, unknown>;
      if (isRecord(b.stock)) {
        this.fx.useStock = true;
        Object.assign(this.fx.stock, b.stock);
      }
      if (isRecord(b.production)) {
        this.fx.useProduction = true;
        Object.assign(this.fx.production, b.production);
      }
      if (typeof b.standardResource === 'number') {
        this.fx.useStandardResource = true;
        this.fx.standardResourceCount = b.standardResource;
      }
      if (typeof b.drawCard === 'number') {
        this.fx.useDrawCard = true;
        this.fx.drawCardCount = b.drawCard;
      }
      if (typeof b.addResources === 'number') {
        this.fx.useAddResources = true;
        this.fx.addResourcesCount = b.addResources;
      }
      if (isRecord(b.global)) {
        this.fx.useGlobal = true;
        this.fx.temperature = b.global.temperature as number | undefined;
        this.fx.oxygen = b.global.oxygen as number | undefined;
        this.fx.venus = b.global.venus as number | undefined;
      }
      for (const kind of ['city', 'greenery', 'ocean'] as const) {
        const placement = b[kind];
        if (isRecord(placement)) {
          this.fx.usePlacement = true;
          this.fx.placementTile = kind;
          this.fx.placementOn = typeof placement.on === 'string' ? placement.on : '';
        }
      }
    },
    descriptorToRow(d: CardRequirementDescriptor): RequirementRow | undefined {
      if (d.oceans !== undefined) {
        return {kind: 'oceans', count: d.oceans, max: d.max === true, tag: Tag.SPACE, resource: Resource.STEEL};
      }
      if (d.temperature !== undefined) {
        return {kind: 'temperature', count: d.temperature, max: d.max === true, tag: Tag.SPACE, resource: Resource.STEEL};
      }
      if (d.oxygen !== undefined) {
        return {kind: 'oxygen', count: d.oxygen, max: d.max === true, tag: Tag.SPACE, resource: Resource.STEEL};
      }
      if (d.tag !== undefined) {
        return {kind: 'tag', count: d.count ?? 1, max: d.max === true, tag: d.tag, resource: Resource.STEEL};
      }
      if (d.production !== undefined) {
        return {kind: 'production', count: d.count ?? 1, max: d.max === true, tag: Tag.SPACE, resource: d.production};
      }
      return undefined;
    },
    newCard(): void {
      this.cardName = '';
      this.type = CardType.AUTOMATED;
      this.tags = [];
      this.compatibility = [];
      this.cost = 8;
      this.hasVictoryPoints = false;
      this.victoryPointsInput = 1;
      this.description = '';
      this.resourceTypeInput = '';
      this.requirements = [];
      this.fx = blankFx();
      this.effectDescription = '';
      this.rows = [[]];
      this.rowDrafts = [blankDraft()];
      this.loadInput = '';
      this.loadError = '';
      this.loadWarning = '';
      this.submittedEntry = undefined;
      this.submitError = '';
    },
    copyCode(): void {
      navigator.clipboard?.writeText(this.code);
    },
    loadCode(): void {
      this.loadError = '';
      this.loadWarning = '';
      let def: CustomCardDefinition;
      try {
        def = decodeCustomCard(this.loadInput);
      } catch (e) {
        this.loadError = e instanceof CustomCardCodecError ? e.message : String(e);
        return;
      }
      this.cardName = def.cardName;
      this.type = def.type;
      this.tags = [...def.tags];
      this.compatibility = [...def.compatibility];
      this.cost = def.cost;
      this.hasVictoryPoints = def.victoryPoints !== undefined;
      this.victoryPointsInput = def.victoryPoints ?? 1;
      this.description = def.description;
      this.resourceTypeInput = def.resourceType ?? '';
      const rows = def.requirements.map((d) => this.descriptorToRow(d)).filter((r): r is RequirementRow => r !== undefined);
      if (rows.length < def.requirements.length) {
        this.loadWarning = (this.loadWarning ? this.loadWarning + ' ' : '') +
          'Some requirements use an advanced type the builder can\'t edit and were dropped.';
      }
      this.requirements = rows;
      this.applyBehaviorToCurated(def.behavior);
      this.effectDescription = def.effectDescription ?? '';
      const loadedRows = (def.renderData.rows ?? []).map((row) => row.map((item) => this.fromRenderItem(item)));
      this.rows = loadedRows.length > 0 ? loadedRows : [[]];
      this.rowDrafts = this.rows.map(() => blankDraft());
      this.loadInput = '';
    },
    async submit(): Promise<void> {
      this.submitting = true;
      this.submitError = '';
      this.submittedEntry = undefined;
      try {
        const response = await fetch(paths.API_CUSTOM_CARD_LIBRARY, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({definition: this.definition, submittedBy: this.submittedBy}),
        });
        if (response.status === 429) {
          this.submitError = 'You are submitting cards too quickly. Try again later.';
          return;
        }
        if (!response.ok) {
          const body = await response.text();
          this.submitError = body || 'That card could not be submitted.';
          return;
        }
        const result = await response.json() as {entry: CustomCardLibraryEntry, warnings: Array<string>};
        this.submittedEntry = result.entry;
      } catch (e) {
        this.submitError = 'Error submitting that card.';
      } finally {
        this.submitting = false;
      }
    },
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
</script>

<style scoped lang="less">
.card-maker {
  padding: 20px;
  color: #ddd;

  h1 { color: #fff; }

  .card-maker-intro {
    max-width: 800px;
    font-size: 13px;
    color: #aaa;
  }

  .card-maker-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .card-maker-controls {
    width: 460px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card-maker-preview {
    flex: 3;
    min-width: 620px;
    position: sticky;
    top: 12px;
  }
  .card-maker-preview-zoom {
    // The real Card component renders at its normal (small) size; blow it up so the preview
    // dominates the screen while editing. `zoom` (not `transform: scale`) reserves real layout
    // space for the enlarged card.
    zoom: 2.5;
    width: fit-content;
  }

  fieldset.card-maker-fieldset {
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px;
    legend { padding: 0 4px; }
  }

  .card-maker-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    margin-bottom: 8px;
    textarea, input[type=text], select { font-family: inherit; }
  }
  .card-maker-field--inline {
    flex-direction: row;
    align-items: center;
  }

  .card-maker-check {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
  .card-maker-check--inline {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }

  .card-maker-tag-stepper {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    padding: 2px 0;
    button {
      width: 22px;
      height: 22px;
      line-height: 1;
      padding: 0;
    }
  }
  .card-maker-tag-stepper-label {
    flex: 1;
  }
  .card-maker-tag-stepper-count {
    min-width: 16px;
    text-align: center;
    font-weight: bold;
  }

  .card-maker-note {
    margin: 2px 0 6px;
    font-size: 11px;
    color: #999;
  }

  .card-maker-units, .card-maker-globals, .card-maker-placement {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px 0 10px 20px;
    font-size: 12px;
    label { display: flex; flex-direction: column; gap: 2px; }
    input[type=number] { width: 56px; }
  }

  .card-maker-requirement {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    padding-bottom: 6px;
    border-bottom: 1px solid #333;
    input[type=number] { width: 60px; }
  }

  .card-maker-row {
    border: 1px solid #333;
    border-radius: 4px;
    padding: 6px;
    margin-bottom: 8px;
  }
  .card-maker-row-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .card-maker-row-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 20px;
    margin-bottom: 6px;
  }
  .card-maker-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #2a2733;
    border-radius: 10px;
    padding: 2px 8px;
    font-size: 11px;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }
  .card-maker-chip-handle {
    color: #777;
    font-size: 12px;
  }
  .card-maker-add-item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    input[type=number] { width: 50px; }
    input[type=text] { width: 100px; }
  }

  .card-maker-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .card-maker-load-input { flex: 1; }

  .card-maker-error { color: #e74c3c; font-size: 12px; margin: 4px 0; }
  .card-maker-warning { color: #f1c40f; font-size: 12px; margin: 4px 0; }
  .card-maker-warnings { color: #f1c40f; font-size: 11px; margin: 4px 0; }
  .card-maker-success { color: #2ecc71; font-size: 12px; margin: 4px 0; }
  .card-maker-submit { margin-top: 4px; }
}
@media (max-width: 700px) {
  .card-maker {
    padding: 12px;
    .card-maker-controls,
    .card-maker-preview { width: 100%; min-width: 0; }
    .card-maker-preview { overflow-x: auto; position: static; }
    .card-maker-actions { flex-wrap: wrap; }
    input, select, textarea { min-width: 0; max-width: 100%; box-sizing: border-box; }
  }
}
</style>
