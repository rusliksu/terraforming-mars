<template>
  <div class="wrybit-create-form">
    <header class="card-list-header card-list-header--plain create-game-head">
      <PageToolbar/><PageTitle title="Create New Game"/>
      <div class="create-game-head-actions">
        <button type="button" class="create-game-icon-button" :aria-label="$t('Load settings from file')" :title="$t('Load settings from file')" @click="binding.importSettings()">
          <svg class="create-game-head-icon" viewBox="0 0 24 24" aria-hidden="true">
            <mask id="create-game-import-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><path :d="importArrowPath" stroke="#000" stroke-width="6"/></mask>
            <polygon mask="url(#create-game-import-cut)" points="11.5,5.2 18.43,9.2 18.43,17.2 11.5,21.2 4.57,17.2 4.57,9.2"/><path :d="importArrowPath"/>
          </svg><span class="create-game-head-label" v-i18n>Import</span>
        </button>
        <button type="button" class="create-game-icon-button" :aria-label="$t('Save settings to file')" :title="$t('Save settings to file')" @click="binding.exportSettings()">
          <svg class="create-game-head-icon" viewBox="0 0 24 24" aria-hidden="true">
            <mask id="create-game-export-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><path :d="exportArrowPath" stroke="#000" stroke-width="6"/></mask>
            <polygon class="create-game-head-icon-filled" mask="url(#create-game-export-cut)" points="12.5,5.2 19.43,9.2 19.43,17.2 12.5,21.2 5.57,17.2 5.57,9.2"/><path :d="exportArrowPath"/>
          </svg><span class="create-game-head-label" v-i18n>Export</span>
        </button>
        <button type="button" class="create-game-icon-button" :aria-label="$t('Copy link with these settings')" :title="$t('Copy link with these settings')" @click="copySettingsLink()">
          <svg class="create-game-head-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg><span class="create-game-head-label">{{ $t(settingsLinkCopied ? 'Link copied' : 'Copy link') }}</span>
        </button>
        <AppButton class="create-game-reset btn-tone-quiet" title="Reset" @click="binding.reset()"/>
      </div>
    </header>
    <div class="create-game-layout">
      <main class="create-game-settings">
        <div class="create-game-cards" :class="'create-game-cards--' + columnCount">
          <div v-for="column in 3" :key="column" :ref="(element) => setColumnElement(column, element)"
            :class="['create-game-cards-column', {'create-game-cards-column--unused': column > columnCount}]"></div>
        </div>
        <template v-if="columnsMounted">
          <Teleport :to="columnTarget('expansions')">
            <section class="create-game-card" :style="cardStyle('expansions')">
              <div class="create-game-card-head create-game-expansions-head"><h2 v-i18n>Expansions</h2><ExpansionGroupMenu v-model="expansionGrouping"/></div>
              <OptionRow label="All official expansions"><SwitchInput v-model="allOfficialExpansions"/></OptionRow>
              <template v-for="group in expansionGroups" :key="expansionGrouping + group.key">
                <CollapsibleSection variant="subhead" :title="group.title" :collapsible="group.key === 'fan'" storageKey="fanExpansions" :defaultOpen="true" :changed="fanNote(group)">
                  <template #actions><button v-if="choicesOf(group).length > 0" type="button" class="create-game-small-button" @click="toggleGroup(group)">{{ $t(allSelected(group) ? 'Deselect all' : 'Select all') }}</button></template>
                  <div class="create-game-chip-grid create-game-expansion-grid">
                    <ChoiceChip v-for="tile in group.tiles" :key="tile.module" :label="tile.choice?.label ?? 'Base game'" :iconClass="tile.choice?.iconClass ?? 'expansion-icon-base'"
                      :selected="tile.choice === undefined || expansions[tile.choice.expansion]" :locked="tile.choice === undefined" :href="tile.choice ? wikiUrls[tile.choice.expansion] : undefined"
                      @select="tile.choice !== undefined && binding.setExpansion(tile.choice.expansion, !expansions[tile.choice.expansion])">
                      <template #detail><span v-for="(part, index) in contentLine(tile, group.highlight, expansionGrouping !== 'source')" :key="index" :class="{'create-game-chip-detail--hit': part.highlighted}">{{ part.text }}</span></template>
                    </ChoiceChip>
                  </div>
                </CollapsibleSection>
              </template>
            </section>
          </Teleport>
<Teleport v-if="hasExpansionOptions" :to="columnTarget('expansionOptions')">
          <section class="create-game-card" :style="cardStyle('expansionOptions')">
            <CollapsibleSection title="Expansion options" storageKey="expansionOptions" >
              <div v-if="expansions.venus" class="create-game-option-group">
                <div class="create-game-option-group-title"><span class="create-game-expansion-icon expansion-icon-venus"></span><span v-i18n>Venus Next</span></div>
                <OptionRow label="Alt. Venus Board" :href="wikiUrls.alternativeVenusBoard"><SwitchInput v-model="altVenusBoard"/></OptionRow>
                <OptionRow v-if="playersCount > 1" label="Mandatory Venus Terraforming" :href="wikiUrls.venusTerraforming">
                  <SwitchInput v-model="requiresVenusTrackCompletion"/>
                </OptionRow>
              </div>
              <div v-if="expansions.turmoil" class="create-game-option-group">
                <div class="create-game-option-group-title"><span class="create-game-expansion-icon expansion-icon-turmoil"></span><span v-i18n>Turmoil</span></div>
                <OptionRow label="Agendas" iconClass="expansion-icon-agendas" href="https://www.notion.so/Political-Agendas-8c6b0b018a884692be29b3ef44b340a9">
                  <SwitchInput :modelValue="binding.agendasEnabled" @update:modelValue="binding.toggleAgendas()"/>
                </OptionRow>
                <SegmentedControl v-if="binding.agendasEnabled" class="create-game-segmented--sub" v-model="politicalAgendasExtension" :options="AGENDA_OPTIONS"/>
                <OptionRow label="Remove negative Global Events" :href="wikiUrls.removeNegativeGlobalEvents">
                  <SwitchInput v-model="removeNegativeGlobalEventsOption"/>
                </OptionRow>
              </div>
              <div v-if="expansions.moon" class="create-game-option-group">
                <div class="create-game-option-group-title"><span class="create-game-expansion-icon expansion-icon-themoon"></span><span v-i18n>The Moon</span></div>
                <OptionRow label="Mandatory Moon Terraforming"><SwitchInput v-model="requiresMoonTrackCompletion"/></OptionRow>
                <OptionRow label="Standard Project Variant #1" :href="wikiUrls.moonStandardProjectVariant"><SwitchInput v-model="moonStandardProjectVariant1"/></OptionRow>
                <OptionRow label="Standard Project Variant #2" :href="wikiUrls.moonStandardProjectVariant"><SwitchInput v-model="moonStandardProjectVariant"/></OptionRow>
              </div>
              <div v-if="expansions.ares" class="create-game-option-group">
                <div class="create-game-option-group-title"><span class="create-game-expansion-icon expansion-icon-ares"></span><span v-i18n>Ares</span></div>
                <OptionRow label="Extreme" :href="wikiUrls.aresExtreme"><SwitchInput v-model="aresExtremeVariant"/></OptionRow>
              </div>
            <PresentationHost v-if="expansions.venusPhase2" :hosts="binding.hosts.venus"/>
              <PresentationHost v-if="expansions.moon" :hosts="binding.hosts.moon"/>
            </CollapsibleSection>
          </section>
        </Teleport>
<Teleport :to="columnTarget('board')">
          <section class="create-game-card" :style="cardStyle('board')">
            <div class="create-game-card-head"><h2 v-i18n>Board</h2></div>

            <div class="create-game-subhead" v-i18n>Random</div>
            <OptionRow label="Random board">
              <SwitchInput v-model="randomBoard"/>
            </OptionRow>
            <SegmentedControl v-if="randomBoard" v-model="randomBoardScope" :options="RANDOM_BOARD_OPTIONS"/>
            <OptionRow label="Randomize board tiles" :href="wikiUrls.randomizeBoardTiles">
              <SwitchInput v-model="shuffleMapOption"/>
            </OptionRow>
            <template v-for="group in boardGroups" :key="group.title">

              <CollapsibleSection variant="subhead" :title="group.title" :collapsible="group.fan" storageKey="fanBoards" >
                <div class="create-game-chip-grid" :class="{'create-game-chip-grid--muted': randomBoard}">
                  <ChoiceChip v-for="boardName in group.boards" :key="boardName"
                    :label="boardName" :capitalized="true" :selected="board === boardName"
                    @select="board = boardName">
                    <template #icon><span :class="binding.boardClass(boardName)"></span></template>
                  </ChoiceChip>
                </div>
              </CollapsibleSection>
            </template>

            <PresentationHost :hosts="binding.hosts.mars"/>
            <CreateGameBoardPreview v-if="binding.boardPreview !== undefined && !seededGame" :binding="binding.boardPreview" :boardColorClass="binding.boardClass"/>
          </section>
        </Teleport>
<Teleport :to="columnTarget('setup')">
          <section class="create-game-card" :style="cardStyle('setup')">
            <div class="create-game-card-head"><h2 v-i18n>Setup</h2></div>
            <OptionRow label="Starting Corporations">
              <NumberStepper v-model="startingCorporations" :min="1" :max="6"/>
            </OptionRow>
            <OptionRow v-if="expansions.prelude" label="Starting Preludes" iconClass="expansion-icon-prelude">
              <NumberStepper v-model="startingPreludes" :min="4" :max="8"/>
            </OptionRow>
            <OptionRow v-if="expansions.ceo" label="Starting CEOs" iconClass="expansion-icon-ceo">
              <NumberStepper v-model="startingCeos" :min="1" :max="6"/>
            </OptionRow>
            <div v-if="expansions.prelude || playersCount > 1" class="create-game-divider"></div>
            <OptionRow v-if="expansions.prelude" label="Merger" iconClass="expansion-icon-prelude" :href="wikiUrls.merger">
              <SwitchInput v-model="twoCorpsVariant"/>
            </OptionRow>
            <template v-if="playersCount > 1">
              <OptionRow label="Draft variant"><SwitchInput v-model="draftVariant"/></OptionRow>
              <OptionRow label="Initial Draft variant" :href="wikiUrls.initialDraft"><SwitchInput v-model="initialDraft"/></OptionRow>
              <template v-if="initialDraft">
                <OptionRow label="10-card one-way initial draft (experimental)" :sub="true"><SwitchInput v-model="initialDraftOneWay"/></OptionRow>
                <OptionRow v-if="expansions.prelude" label="Prelude Draft" :sub="true"><SwitchInput v-model="preludeDraftVariant"/></OptionRow>
                <OptionRow v-if="expansions.ceo" label="CEO Draft" :sub="true"><SwitchInput v-model="ceosDraftVariant"/></OptionRow>
              </template>
            </template>
          </section>
        </Teleport>
<Teleport :to="columnTarget('rules')">
          <section class="create-game-card" :style="cardStyle('rules')">
            <div class="create-game-card-head"><h2 v-i18n>House-rule variants &amp; pace</h2></div>
            <OptionRow label="World Government Terraforming" :href="wikiUrls.worldGovernmentTerraforming">
              <SwitchInput v-model="solarPhaseOption" :disabled="true"/>
            </OptionRow>
            <OptionRow v-if="playersCount === 1" label="63 TR solo mode" :href="wikiUrls.trSoloMode">
              <SwitchInput v-model="soloTR"/>
            </OptionRow>
            <OptionRow label="Allow undo" :href="wikiUrls.allowUndo"><SwitchInput v-model="undoOption"/></OptionRow>
            <div v-if="undoOption" class="create-game-note">
              <span v-i18n>Undo is now in best effort support.</span>
              <span v-i18n>No effort will be spent to fix it.</span>
              <InfoLink href="https://github.com/terraforming-mars/terraforming-mars/discussions/7647"/>
            </div>
            <OptionRow label="Show timers"><SwitchInput v-model="showTimers"/></OptionRow>
            <template v-if="playersCount > 1">
              <OptionRow label="Show real-time VP" :href="wikiUrls.showRealtimeVP"><SwitchInput v-model="showOtherPlayersVP"/></OptionRow>
              <OptionRow label="Fast mode" :href="wikiUrls.fastMode"><SwitchInput v-model="fastModeOption"/></OptionRow>
            </template>
            <OptionRow label="Escape Velocity" iconClass="expansion-icon-escape-velocity" :href="wikiUrls.escapeVelocity">
              <SwitchInput v-model="escapeVelocityMode"/>
            </OptionRow>
            <template v-if="escapeVelocityMode">
              <div class="create-game-option create-game-option--sub">
                <span v-i18n>After</span>
                <NumberStepper v-model="escapeVelocityThreshold" :min="0" :max="180" :step="5"/>
                <span v-i18n>min</span>
              </div>
              <div class="create-game-option create-game-option--sub">
                <span v-i18n>Plus</span>
                <NumberStepper v-model="escapeVelocityBonusSeconds" :min="1" :max="10"/>
                <span v-i18n>seconds per action</span>
              </div>
              <div class="create-game-option create-game-option--sub">
                <span v-i18n>Reduce</span>
                <NumberStepper v-model="escapeVelocityPenalty" :min="1" :max="10"/>
                <span v-i18n>VP every</span>
                <NumberStepper v-model="escapeVelocityPeriod" :min="1" :max="10"/>
                <span v-i18n>min</span>
              </div>
            </template>
          <div class="create-game-divider"></div>
            <div class="create-game-subhead" v-i18n>Knightbyte server settings</div>
            <OptionRow label="Undo one step (experimental)" :href="wikiUrls.undoOneStep"><SwitchInput v-model="undoStepOption"/></OptionRow>
            <OptionRow label="Private hands"><SwitchInput v-model="privateHands"/></OptionRow>
            <OptionRow label="Training game (no ELO)"><SwitchInput v-model="noEloGame"/></OptionRow>
            <OptionRow label="Async game (Telegram)"><SwitchInput v-model="turnBasedGame"/></OptionRow>
            <OptionRow label="Bot players"><SwitchInput v-model="botGame"/></OptionRow>
          </section>
        </Teleport>
<Teleport v-if="playersCount > 1" :to="columnTarget('milestones')">
          <section class="create-game-card" :style="cardStyle('milestones')">
            <CollapsibleSection title="Milestones & Awards" storageKey="milestones" >
              <template #actions><InfoLink :href="wikiUrls.randomMilestonesAndAwards"/></template>
              <SegmentedControl v-model="randomMA" :options="MILESTONE_OPTIONS"/>
              <template v-if="randomMA !== RandomMAOptionType.NONE">
                <OptionRow label="Official Random α" :sub="true"><SwitchInput v-model="modularMA"/></OptionRow>
                <div v-if="modularMA" class="create-game-note">
                  <span v-i18n>The new Milestones and Awards are still in active development. Please don't report anything unless it breaks the game.</span>
                  <b v-i18n>These are always fully random.</b>
                </div>
                <OptionRow label="Include fan Milestones/Awards" :sub="true"><SwitchInput v-model="includeFanMA"/></OptionRow>
              </template>
            </CollapsibleSection>
          </section>
        </Teleport>
<Teleport :to="columnTarget('cardPool')">
          <section class="create-game-card" :style="cardStyle('cardPool')">
            <CollapsibleSection title="Card pool" storageKey="cardPool" >
              <div class="create-game-chip-grid create-game-chip-grid--two">
                <ChoiceChip label="Custom Corporation list" :selected="showCorporationList" @select="showCorporationList = !showCorporationList">
                  <span v-if="customCorporations.length" class="create-game-count">{{ customCorporations.length }}</span>
                </ChoiceChip>
                <ChoiceChip v-if="expansions.prelude" label="Custom Preludes list" :selected="showPreludesList" @select="showPreludesList = !showPreludesList">
                  <span v-if="customPreludes.length" class="create-game-count">{{ customPreludes.length }}</span>
                </ChoiceChip>
                <ChoiceChip v-if="expansions.ceo" label="Custom CEOs list" :selected="showCeosList" @select="showCeosList = !showCeosList">
                  <span v-if="customCeos.length" class="create-game-count">{{ customCeos.length }}</span>
                </ChoiceChip>
                <ChoiceChip v-if="expansions.colonies" label="Custom Colonies list" :selected="showColoniesList" @select="showColoniesList = !showColoniesList">
                  <span v-if="customColonies.length" class="create-game-count">{{ customColonies.length }}</span>
                </ChoiceChip>
                <ChoiceChip label="Exclude some cards" :selected="showBannedCards" @select="showBannedCards = !showBannedCards">
                  <span v-if="bannedCards.length" class="create-game-count">{{ bannedCards.length }}</span>
                </ChoiceChip>
                <ChoiceChip label="Include some cards" :selected="showIncludedCards" @select="showIncludedCards = !showIncludedCards">
                  <span v-if="includedCards.length" class="create-game-count">{{ includedCards.length }}</span>
                </ChoiceChip>
              </div>
              <OptionRow label="Set Predefined Game" :href="wikiUrls.setPredefinedGame"><SwitchInput v-model="seededGame"/></OptionRow>
              <input v-if="seededGame" type="text" name="clonedGamedId" class="create-game-text-input" :placeholder="$t('game id:')" v-model="clonedGameId">
            <AppButton title="Clear custom lists" @click="binding.clearCustomLists()"/>
            </CollapsibleSection>
          </section>
        </Teleport>
        </template>
        <CustomCardListCard v-for="list in visibleCustomLists" :key="list.kind" :binding="list"/>
        <section v-if="showColoniesList" class="create-game--block"><h2 v-i18n>Custom Colonies list</h2><PresentationHost :hosts="binding.hosts.colonies"/></section>
        <PresentationHost :hosts="binding.hosts.banned"/>
        <PresentationHost :hosts="binding.hosts.included"/>
      </main>
      <aside class="create-game-side">
        <section class="create-game-players">
          <div class="create-game-players-scroll" @scroll="playerListScrolled = ($event.target as HTMLElement).scrollTop > 0">
            <div class="create-game-players-head" :class="{'create-game-players-head--over-list': playerListScrolled}">
              <h2 v-i18n>Players</h2>
              <SegmentedControl v-model="playersCount" :options="PLAYER_COUNT_OPTIONS" class="create-game-segmented--equal create-game-segmented--seats"/>
              <OptionRow v-if="playersCount > 1" class="create-game-players-first" label="Random first player"><SwitchInput v-model="randomFirstPlayer"/></OptionRow>
            </div>
            <PresentationHost :hosts="binding.hosts.players"/>
          </div>
        </section>
        <section ref="createCard" class="create-game-card create-game-create-card" :class="{'create-game-create-card--stuck': createCardStuck}">
          <div class="create-game-create-row">
            <AppButton class="create-game-create" title="Create game" size="big" @click="binding.create()" :disabled="binding.hasBlockingValidationErrors"/>
          </div>
          <ValidationProblems v-if="binding.hasValidationProblems" :errors="binding.validationErrors"/>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import type {CreatePresentationBinding} from './presentation';
import {useCreateFields} from './controlledFields';
import {currentColumnCount, placementOf, watchColumnCount} from './createGameColumns';
import type {SettingsCard} from './createGameColumns';
import {observeStickyBottom} from './stickyBottomObserver';
import {groupExpansions, loadExpansionGrouping, saveExpansionGrouping} from './expansionGrouping';
import type {ExpansionGroup} from './expansionGrouping';
import {contentLine} from './expansionContentLine';
import ExpansionGroupMenu from './ExpansionGroupMenu.vue';
import CreateGameBoardPreview from './CreateGameBoardPreview.vue';
import CustomCardListCard from './CustomCardListCard.vue';
import {BoardName} from '@/common/boards/BoardName';
import {RandomBoardOption} from '@/common/boards/RandomBoardOption';
import {RandomMAOptionType} from '@/common/ma/RandomMAOptionType';
import type {BoardNameType} from '@/common/game/NewGameConfig';
import AppButton from '@/client/components/common/AppButton.vue';
import PresentationHost from '@/client/wrybit/inputs/PresentationHost.vue';
import PageToolbar from '@/client/wrybit/visuals/PageToolbar.vue';
import PageTitle from '@/client/wrybit/visuals/common/PageTitle.vue';
import NumberStepper from './NumberStepper.vue';
import SwitchInput from './SwitchInput.vue';
import SegmentedControl from './SegmentedControl.vue';
import CollapsibleSection from './CollapsibleSection.vue';
import OptionRow from './OptionRow.vue';
import InfoLink from './InfoLink.vue';
import ChoiceChip from './ChoiceChip.vue';
import ValidationProblems from './ValidationProblems.vue';

const props = defineProps<{binding: CreatePresentationBinding}>();
const settingsLinkCopied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
let copyEpoch = 0;
async function copySettingsLink() {
  const epoch = ++copyEpoch;
  const copied = await props.binding.copySettingsLink();
  if (epoch !== copyEpoch) {
    return;
  }
  clearTimeout(copiedTimer);
  settingsLinkCopied.value = copied;
  if (copied) {
    copiedTimer = setTimeout(() => {
      settingsLinkCopied.value = false;
    }, 2000);
  }
}
const visibleCustomLists = computed(() => props.binding.customLists.filter((list) => {
  if (list.kind === 'corporations') {
    return props.binding.model.showCorporationList;
  }
  if (list.kind === 'preludes') {
    return props.binding.model.showPreludesList;
  }
  return props.binding.model.showCeosList;
}));
const importArrowPath = 'M5.44 2.7L11.75 13.63M12.33 10.89L11.75 13.63L9.09 12.77';
const exportArrowPath = 'M12.25 13.63L18.56 2.7M15.9 3.56L18.56 2.7L19.15 5.44';
const {field} = useCreateFields(() => props.binding);
const expansions = computed(() => props.binding.model.expansions);
const wikiUrls = computed(() => props.binding.wikiUrls);
const allOfficialExpansions = field('allOfficialExpansions');
const altVenusBoard = field('altVenusBoard');
const aresExtremeVariant = field('aresExtremeVariant');
const botGame = field('botGame');
const ceosDraftVariant = field('ceosDraftVariant');
const clonedGameId = field('clonedGameId');
const draftVariant = field('draftVariant');
const escapeVelocityBonusSeconds = field('escapeVelocityBonusSeconds');
const escapeVelocityMode = field('escapeVelocityMode');
const escapeVelocityPenalty = field('escapeVelocityPenalty');
const escapeVelocityPeriod = field('escapeVelocityPeriod');
const escapeVelocityThreshold = field('escapeVelocityThreshold');
const fastModeOption = field('fastModeOption');
const includeFanMA = field('includeFanMA');
const initialDraft = field('initialDraft');
const initialDraftOneWay = field('initialDraftOneWay');
const modularMA = field('modularMA');
const moonStandardProjectVariant = field('moonStandardProjectVariant');
const moonStandardProjectVariant1 = field('moonStandardProjectVariant1');
const noEloGame = field('noEloGame');
const playersCount = field('playersCount');
const politicalAgendasExtension = field('politicalAgendasExtension');
const preludeDraftVariant = field('preludeDraftVariant');
const privateHands = field('privateHands');
const randomFirstPlayer = field('randomFirstPlayer');
const randomMA = field('randomMA');
const removeNegativeGlobalEventsOption = field('removeNegativeGlobalEventsOption');
const requiresMoonTrackCompletion = field('requiresMoonTrackCompletion');
const requiresVenusTrackCompletion = field('requiresVenusTrackCompletion');
const seededGame = field('seededGame');
const showCorporationList = field('showCorporationList');
const showPreludesList = field('showPreludesList');
const showCeosList = field('showCeosList');
const showColoniesList = field('showColoniesList');
const showBannedCards = field('showBannedCards');
const showIncludedCards = field('showIncludedCards');
const showOtherPlayersVP = field('showOtherPlayersVP');
const showTimers = field('showTimers');
const shuffleMapOption = field('shuffleMapOption');
const solarPhaseOption = field('solarPhaseOption');
const soloTR = field('soloTR');
const startingCeos = field('startingCeos');
const startingCorporations = field('startingCorporations');
const startingPreludes = field('startingPreludes');
const turnBasedGame = field('turnBasedGame');
const twoCorpsVariant = field('twoCorpsVariant');
const undoOption = field('undoOption');
const undoStepOption = field('undoStepOption');
const customCorporations = computed(() => props.binding.model.customCorporations);
const customPreludes = computed(() => props.binding.model.customPreludes);
const customCeos = computed(() => props.binding.model.customCeos);
const customColonies = computed(() => props.binding.model.customColonies);
const bannedCards = computed(() => props.binding.model.bannedCards);
const includedCards = computed(() => props.binding.model.includedCards);

const PLAYER_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6].map((value) => ({value, label: value === 1 ? 'Solo' : String(value)}));
const AGENDA_OPTIONS = [{value: 'Random', label: 'Random'}, {value: 'Chairman', label: 'Chairman'}];
const MILESTONE_OPTIONS = [{value: RandomMAOptionType.NONE, label: 'Board-defined'}, {value: RandomMAOptionType.LIMITED, label: 'Random limited'}, {value: RandomMAOptionType.UNLIMITED, label: 'Random full'}];
const RANDOM_BOARD_OPTIONS = [{value: RandomBoardOption.OFFICIAL, label: 'Official'}, {value: RandomBoardOption.ALL, label: 'All'}];
const expansionGrouping = ref(loadExpansionGrouping());
const expansionGroups = computed(() => groupExpansions(expansionGrouping.value));
watch(expansionGrouping, saveExpansionGrouping);
function choicesOf(group: ExpansionGroup) {
  return group.tiles.flatMap((tile) => tile.choice === undefined ? [] : [tile.choice]);
}
function allSelected(group: ExpansionGroup) {
  return choicesOf(group).every((choice) => expansions.value[choice.expansion]);
}
function toggleGroup(group: ExpansionGroup) {
  const enabled = !allSelected(group);
  for (const choice of choicesOf(group)) {
    props.binding.setExpansion(choice.expansion, enabled);
  }
}
function fanNote(group: ExpansionGroup) {
  return group.key === 'fan' ? choicesOf(group).filter((choice) => expansions.value[choice.expansion]).map((choice) => choice.label).join(', ') : undefined;
}
const hasExpansionOptions = computed(() => (['venus', 'venusPhase2', 'turmoil', 'moon', 'ares'] as const).some((key) => expansions.value[key]));
const board = field('board');
const namedBoard = ref<BoardNameType>(BoardName.THARSIS);
const randomBoard = computed({get: () => board.value === RandomBoardOption.OFFICIAL || board.value === RandomBoardOption.ALL,
  set: (random) => {
    if (random && !randomBoard.value) {
      namedBoard.value = board.value; board.value = RandomBoardOption.OFFICIAL;
    }
    if (!random && randomBoard.value) {
      board.value = namedBoard.value;
    }
  }});
const randomBoardScope = computed({get: () => board.value, set: (scope: string | number) => {
  if (scope === RandomBoardOption.OFFICIAL || scope === RandomBoardOption.ALL) {
    board.value = scope;
  }
}});
const boardGroups = computed(() => {
  const official = [BoardName.THARSIS, BoardName.HELLAS, BoardName.ELYSIUM];
  const named = props.binding.boards.filter((name) => name !== RandomBoardOption.OFFICIAL && name !== RandomBoardOption.ALL);
  return [{title: 'Official', fan: false, boards: named.filter((name) => official.includes(name as BoardName))},
    {title: 'Fan-made', fan: true, boards: named.filter((name) => !official.includes(name as BoardName))}];
});
const columnCount = ref(currentColumnCount());
const columnsMounted = ref(false);
const columns: Partial<Record<number, HTMLElement>> = {};
const playerListScrolled = ref(false);
const createCard = ref<HTMLElement>();
const createCardStuck = ref(false);
function setColumnElement(column: number, element: unknown) {
  if (element instanceof HTMLElement) {
    columns[column] = element;
  }
}
function columnTarget(card: SettingsCard) {
  return columns[placementOf(card, columnCount.value).column + 1];
}
function cardStyle(card: SettingsCard) {
  return {order: placementOf(card, columnCount.value).order};
}
let stopColumns: (() => void) | undefined;
let stopSticky: (() => void) | undefined;
onMounted(() => {
  columnsMounted.value = true;
  stopColumns = watchColumnCount((value) => {
    columnCount.value = value;
  });
  if (createCard.value !== undefined) {
    stopSticky = observeStickyBottom(createCard.value, 12, (value) => {
      createCardStuck.value = value;
    });
  }
});
onBeforeUnmount(() => {
  stopColumns?.(); stopSticky?.();
  copyEpoch++;
  clearTimeout(copiedTimer);
});
</script>
