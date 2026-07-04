<template>
  <div class='wf-options'>
    <label v-if="showtitle"><div>{{ $t(playerinput.title) }}</div></label>
    <label v-if="playerinput.warning !== undefined" class="card-warning"><div>({{ $t(playerinput.warning) }})</div></label>
    <div v-for="(option, idx) in displayedOptions" :key="idx">
      <label class="form-radio" ref="optionLabels">
        <input v-model="selectedOption" type="radio" :name="radioElementName" :value="option" >
        <i class="form-icon" ></i>
        <span>{{ $t(option.title) }}</span>
      </label>
      <div v-if="selectedIdx === idx" style="margin-left: 30px">
        <PlayerInputFactory ref="inputfactory"
                              :playerView="playerView"
                              :playerinput="option"
                              :onsave="playerFactorySaved(idx)"
                              :showsave="showsave && showChildSaveButton(option)"
                              :showtitle="false" />
      </div>
    </div>
    <div v-if="showsave && selectedOption && !showChildSaveButton(selectedOption)">
      <div style="margin: 5px 30px 10px" class="wf-action">
        <AppButton :title="$t(selectedOption.buttonLabel)" type="submit" size="normal" @click="saveData" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import AppButton from '@/client/components/common/AppButton.vue';
import {isHTMLElement} from '@/client/utils/vueUtils';
import {PlayerViewModel} from '@/common/models/PlayerModel';
import {OrOptionsModel, PlayerInputModel, SelectSpaceModel} from '@/common/models/PlayerInputModel';
import {getPreferences} from '@/client/utils/PreferencesManager';
import {InputResponse, OrOptionsResponse} from '@/common/inputs/InputResponse';
import {Message} from '@/common/logs/Message';
import {SpaceId} from '@/common/Types';

let unique = 0;
type QuickGreeneryHandler = {tile: HTMLElement, handler: (event: Event) => void};

export default defineComponent({
  name: 'OrOptions',
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
      displayedOptions,
      originalIndices,
      radioElementName: 'selectOption' + unique++,
      selectedOption: displayedOptions[selectedIdx],
      selectedIdx,
      quickGreeneryHandlers: [] as Array<QuickGreeneryHandler>,
    };
  },
  watch: {
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
    saveData() {
      let ref = this.$refs['inputfactory'] as {saveData: () => void} | Array<{saveData: () => void}>;
      if (Array.isArray(ref)) {
        ref = ref[0];
      }
      ref.saveData();
    },
  },
  mounted() {
    this.$nextTick(() => this.setupQuickGreeneryPlacement());
  },
  unmounted() {
    this.clearQuickGreeneryHandlers();
  },
});

</script>
