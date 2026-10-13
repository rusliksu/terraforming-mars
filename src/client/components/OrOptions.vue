<template>
  <component v-if="orPresentation !== undefined" :is="orPresentation" :binding="presentationBinding" v-bind="$attrs"/>
  <div v-else class='wf-options' v-bind="$attrs">
    <label v-if="showtitle"><div>{{ $t(playerinput.title) }}</div></label>
    <label v-if="playerinput.warning !== undefined" class="card-warning"><div>({{ $t(playerinput.warning) }})</div></label>
    <div v-for="(option, idx) in displayedOptions"
         :key="idx"
         class="wf-option"
         :data-input-annotation="option.annotation">
      <label class="form-radio" ref="optionLabels">
        <input v-model="selectedOption" type="radio" :name="radioElementName" :value="option" >
        <i class="form-icon" ></i>
        <span>{{ $t(option.title) }}</span>
      </label>
      <div v-if="selectedIdx === idx" style="margin-left: 30px">
        <PresentationHost :hosts="childHost"/>
      </div>
    </div>
    <div v-if="showsave && selectedOption && !showChildSaveButton(selectedOption)">
      <div style="margin: 5px 30px 10px" class="wf-action">
        <AppButton :title="$t(selectedOption.buttonLabel)" type="submit" size="normal" @click="saveData()" />
      </div>
    </div>
  </div>
  <InputPortal :target="childHost.target.value">
    <PlayerInputFactory v-if="selectedOption !== undefined" ref="inputfactory" :key="selectedIdx"
      :playerView="playerView" :playerinput="selectedOption" :onsave="playerFactorySaved(selectedIdx)"
      :presentationIntro="asTabs"
      :showsave="showsave && showChildSaveButton(selectedOption)" :showtitle="false"/>
  </InputPortal>
</template>

<script lang="ts">

import {defineComponent, inject, provide, shallowRef} from 'vue';
import {createInputHosts, INPUT_HOSTS} from '@/client/wrybit/shell/inputHosts';
import InputPortal from '@/client/wrybit/shell/InputPortal.vue';
import PresentationHost from '@/client/wrybit/inputs/PresentationHost.vue';
import {INPUT_DEPTH, INPUT_FOOTER, OrOptionsBinding, useInputPresentation} from '@/client/wrybit/inputs/presentation';
import {afterSave, useSaveSession, withSaveAttempt} from '@/client/wrybit/inputs/saveAttempt';
import type {InputCollector, MaybePromise, SaveAttempt, SaveOutcome} from '@/client/wrybit/inputs/saveAttempt';
import AppButton from '@/client/components/common/AppButton.vue';
import {isHTMLElement} from '@/client/utils/vueUtils';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {OrOptionsModel, PlayerInputModel, SelectSpaceModel} from '@/common/models/PlayerInputModel';
import {getPreferences} from '@/client/utils/PreferencesManager';
import {InputResponse, OrOptionsResponse} from '@/common/inputs/InputResponse';
import {Message} from '@/common/logs/Message';
import {SpaceId} from '@/common/Types';
import type {InputChoice, InputChoiceEditor} from './inputChoice';
import {partyCardDetails} from './turmoil/partyCardDetails';

let unique = 0;
type QuickGreeneryHandler = {tile: HTMLElement, handler: (event: Event) => void};

export default defineComponent({
  name: 'OrOptions',
  inheritAttrs: false,
  setup() {
    const asTabs = inject(INPUT_DEPTH, 1) === 1;
    const footerHost = createInputHosts();
    if (asTabs) {
      provide(INPUT_FOOTER, footerHost.target);
    }
    return {inputHost: inject(INPUT_HOSTS, undefined)?.target, asTabs, footerHost,
      childHost: createInputHosts(), orPresentation: useInputPresentation('or'), saveSession: useSaveSession(),
      inputfactory: shallowRef<InputChoiceEditor>()};
  },
  props: {
    playerView: {
      type: Object as () => PlayerViewModel,
      required: true,
    },
    playerinput: {
      type: Object as () => OrOptionsModel,
      required: true,
    },
    onsave: {
      type: Function as unknown as () => (out: OrOptionsResponse) => void,
      required: true,
    },
    showsave: {
      type: Boolean,
    },
    showtitle: {
      type: Boolean,
    },
  },
  components: {
    AppButton,
    InputPortal,
    PresentationHost,
  },
  computed: {
    presentationBinding(): OrOptionsBinding {
      const turmoil = this.playerView.game.turmoil;
      return {
        asTabs: this.asTabs, playerView: this.playerView, playerinput: this.playerinput, showsave: this.showsave, showtitle: this.showtitle,
        displayedOptions: this.displayedOptions, selectedOption: this.selectedOption, selectedIdx: this.selectedIdx,
        selectedChoice: this.inputfactory?.getChoice(),
        partyCards: turmoil === undefined ? [] : turmoil.parties.map((party) => partyCardDetails(turmoil, party, this.playerView.game.gameOptions.expansions.moreParties)),
        radioElementName: this.radioElementName, childHost: this.childHost, footerHost: this.footerHost,
        select: (option) => {
          this.selectedOption = option;
        }, selectChoice: this.selectChoice, chooseAndSave: this.chooseAndSave, showChildSaveButton: (option) => this.showChildSaveButton(option),
        registerLabel: (index, element) => {
          if (element === null) {
            this.presentationLabels.delete(index);
          } else {
            this.presentationLabels.set(index, element);
          }
        },
        save: () => this.saveData(),
      };
    },
  },
  data() {
    const displayedOptions: Array<PlayerInputModel> = [];
    const originalIndices: Array<number> = [];
    this.playerinput.options.forEach((option, i) => {
      if (option.type === 'card' && option.showOnlyInLearnerMode !== false && !getPreferences().learner_mode) {
        return;
      }
      displayedOptions.push(option);
      originalIndices.push(i);
    });
    const initialIdx = this.playerinput.initialIdx ?? 0;
    // Special case: If the first recommended displayed option is SelectProjectCardToPlay, and none of them are enabled, skip it.
    let selectedIdx = initialIdx;
    if (displayedOptions.length > 1 &&
      displayedOptions[initialIdx].type === 'projectCard' &&
      !displayedOptions[initialIdx].cards.some((card) => card.isDisabled !== true)) {
      selectedIdx = initialIdx + 1;
    }
    return {
      active: true,
      displayedOptions,
      originalIndices,
      radioElementName: 'selectOption' + unique++,
      selectedOption: displayedOptions[selectedIdx],
      selectedIdx,
      quickGreeneryHandlers: [] as Array<QuickGreeneryHandler>,
      presentationLabels: new Map<number, HTMLElement>(),
    };
  },
  watch: {
    inputHost() {
      this.$nextTick(() => this.setupQuickGreeneryPlacement());
    },
    selectedOption(newOption: PlayerInputModel) {
      this.selectedIdx = this.displayedOptions.indexOf(newOption);
      // Clicking the option can shift elements on the page.
      // This preserves the location of the option button the user just clicked by
      // tracking where it was on the screen, where it moved, and then repositioning it.
      const anchorTop = this.getSelectedOptionTop();
      this.$nextTick(() => {
        const newTop = this.getSelectedOptionTop();
        if (anchorTop !== undefined && newTop !== undefined) {
          const delta = newTop - anchorTop;
          if (Math.abs(delta) > 0.5) {
            window.scrollBy(0, delta);
          }
        }
        this.setupQuickGreeneryPlacement();
      });
    },
    playerinput() {
      this.$nextTick(() => this.setupQuickGreeneryPlacement());
    },
  },
  methods: {
    async chooseAndSave(option: PlayerInputModel) {
      if (!this.active || !this.showsave || option.type !== 'option' || !this.displayedOptions.includes(option) || this.orPresentation === undefined) {
        return;
      }
      this.selectedOption = option;
      await this.$nextTick();
      if (this.active && this.selectedOption === option && this.orPresentation !== undefined) {
        await this.saveData();
      }
    },
    async selectChoice(option: PlayerInputModel, choice: InputChoice) {
      if (!this.displayedOptions.includes(option) || this.orPresentation === undefined) {
        return;
      }
      this.selectedOption = option;
      await this.$nextTick();
      if (this.selectedOption === option && this.orPresentation !== undefined) {
        this.inputfactory?.selectChoice(choice);
      }
    },
    clearQuickGreeneryHandlers() {
      for (const entry of this.quickGreeneryHandlers) {
        entry.tile.removeEventListener('click', entry.handler);
        if (entry.tile.onclick === null) {
          entry.tile.classList.remove('board-space--available');
        }
      }
      this.quickGreeneryHandlers = [];
    },
    getBoardSpaces(): Array<HTMLElement> {
      const spaces: Array<HTMLElement> = [];
      const regions = ['main_board', 'moon_board', 'colony_spaces', 'moon_board_outer_spaces'];
      for (const region of regions) {
        const board = document.getElementById(region);
        if (board === null) {
          continue;
        }
        const elements = board.getElementsByClassName('board-space-selectable');
        for (const element of Array.from(elements)) {
          spaces.push(element as HTMLElement);
        }
      }
      return spaces;
    },
    getQuickGreeneryOption(): {index: number, option: SelectSpaceModel} | undefined {
      if (this.playerinput.buttonLabel !== 'Take action') {
        return undefined;
      }
      const index = this.playerinput.options.findIndex((option) =>
        option.type === 'space' && this.isConvertPlantsTitle(option.title));
      if (index === -1) {
        return undefined;
      }
      const option = this.playerinput.options[index];
      if (option.type !== 'space') {
        return undefined;
      }
      return {index, option};
    },
    isConvertPlantsTitle(title: string | Message): boolean {
      if (typeof title === 'string') {
        return title.startsWith('Convert ') && title.endsWith(' plants into greenery');
      }
      return title.message === 'Convert ${0} plants into greenery';
    },
    setupQuickGreeneryPlacement() {
      this.clearQuickGreeneryHandlers();
      const quickGreenery = this.getQuickGreeneryOption();
      if (quickGreenery === undefined || this.selectedOption === quickGreenery.option) {
        return;
      }
      const spaces = new Set<SpaceId>(quickGreenery.option.spaces);
      for (const tile of this.getBoardSpaces()) {
        const spaceId = tile.getAttribute('data_space_id') as SpaceId | null;
        if (spaceId === null || !spaces.has(spaceId) || tile.onclick !== null) {
          continue;
        }
        const handler = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          this.clearQuickGreeneryHandlers();
          this.onsave({
            type: 'or',
            index: quickGreenery.index,
            response: {type: 'space', spaceId},
          });
        };
        tile.classList.add('board-space--available');
        tile.addEventListener('click', handler);
        this.quickGreeneryHandlers.push({tile, handler});
      }
    },
    getSelectedOptionTop(): number | undefined {
      const element = this.getSelectedOptionLabelElement();
      return element?.getBoundingClientRect().top;
    },
    getSelectedOptionLabelElement(): HTMLElement | undefined {
      const idx = this.selectedIdx;
      if (this.orPresentation !== undefined) {
        return this.presentationLabels.get(idx);
      }
      const optionLabels = this.$refs.optionLabels as HTMLElement | HTMLElement[] | undefined;
      if (idx === -1 || !optionLabels) {
        return undefined;
      }

      const val = Array.isArray(optionLabels) ? optionLabels[idx] : optionLabels;
      return isHTMLElement(val) ? val : undefined;
    },
    playerFactorySaved(displayedIdx: number) {
      const idx = this.originalIndices[displayedIdx];
      return (out: InputResponse) => {
        this.onsave({
          type: 'or',
          index: idx,
          response: out,
        });
      };
    },
    // When the child component is a multi-select card, let it render its own save button.
    // This allows the child to control the button label (e.g. "Sell 3 patents").
    showChildSaveButton(option: PlayerInputModel): boolean {
      return option.type === 'card' && !(option.max === 1 && option.min === 1);
    },
    saveData(attempt?: SaveAttempt, respond?: (response: OrOptionsResponse) => void): MaybePromise<SaveOutcome> {
      const reply = respond ?? this.onsave;
      return withSaveAttempt(this.saveSession, attempt, (current) => {
        const reference = this.$refs.inputfactory as InputCollector | Array<InputCollector> | undefined;
        const child = Array.isArray(reference) ? reference[0] : reference;
        const index = this.originalIndices[this.selectedIdx];
        if (child === undefined || index === undefined) {
          return 'invalid';
        }
        return afterSave(child.collectResponse(current), (collected) => {
          if (collected.outcome !== 'saved') {
            return collected.outcome;
          }
          if (!current.isCurrent()) {
            return 'cancelled';
          }
          reply({type: 'or', index, response: collected.response});
          return 'saved';
        });
      });
    },
  },
  mounted() {
    this.$nextTick(() => this.setupQuickGreeneryPlacement());
  },
  unmounted() {
    this.clearQuickGreeneryHandlers();
  },
  beforeUnmount() {
    this.active = false;
  },
});

</script>
