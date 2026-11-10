<template>
  <component v-if="presentation !== undefined" :is="presentation" :binding="presentationBinding" />
  <PopupPanel v-else class="cards-filter" @close="$emit('close')">
    <template #header>
      <h2 v-i18n>{{ title }}</h2>
    </template>
    <div class="cards-filter-input">
      <div>
        <PresentationHost :hosts="inputHost" />
      </div>
      <div class="cards-filter-suggest" v-if="searchMatches.length">
        <div class="cards-filter-suggest-item" v-for="(cardName, idx) in searchMatches" :key="cardName"
          :class="{'cards-filter-suggest-item-highlighted': idx === activeIndex}"
          @mouseenter="activeIndex = idx">
          <a href="#" @click.prevent="addCard(cardName)">
            {{ cardName }}
            <i class="create-game-expansion-icon expansion-icon-prelude" title="This card is a Prelude" v-if="isPrelude(cardName)"></i>
            <i class="create-game-expansion-icon expansion-icon-ceo" title="This card is a CEO" v-if="isCEO(cardName)"></i>
            <template v-for="expansion in expansions(cardName)" :key="expansion">
              <i :class="`create-game-expansion-icon expansion-icon-${expansion}`" :title="expansion"></i>
            </template>
          </a>
        </div>
      </div>
    </div>
    <div class="cards-filter-results-cont" v-if="selectedCards.length">
      <div class="cards-filter-result" v-for="cardName in selectedCards" :key="cardName">
        <AppButton size="small" type="close" @click="removeCard(cardName)" />
        <label>{{ cardName }}
          <i class="create-game-expansion-icon expansion-icon-prelude" title="This card is a prelude" v-if="isPrelude(cardName)"></i>
          <i class="create-game-expansion-icon expansion-icon-ceo" title="This card is a CEO" v-if="isCEO(cardName)"></i>
          <template v-for="expansion in expansions(cardName)" :key="expansion">
            <i :class="`create-game-expansion-icon expansion-icon-${expansion}`" :title="expansion"></i>
          </template>
        </label>
      </div>
    </div>
    <InputPortal :target="inputHost.target.value">
      <input ref="filter" class="form-input" :placeholder="$t(hint)" v-model="searchTerm" @keydown="onFilterKeydown">
    </InputPortal>
  </PopupPanel>
</template>

<script lang="ts">
import {computed, defineComponent} from 'vue';
import {createInputHosts} from '@/client/wrybit/shell/inputHosts';
import InputPortal from '@/client/wrybit/shell/InputPortal.vue';
import PresentationHost from '@/client/wrybit/inputs/PresentationHost.vue';
import {useCreateControls} from '@/client/wrybit/create/presentation';
import type {CardsFilterBinding} from '@/client/wrybit/create/cardsFilter';
import {CardName} from '@/common/cards/CardName';
import AppButton from '@/client/components/common/AppButton.vue';
import PopupPanel from '@/client/components/common/PopupPanel.vue';
import {byType, getCard, getCards} from '@/client/cards/ClientCardManifest';
import {CardType} from '@/common/cards/CardType';
import {inplaceRemove, toName} from '@/common/utils/utils';
import {Expansion} from '@/common/cards/GameModule';

const ALL_CARDS: Array<CardName> = [
  ...getCards(byType(CardType.AUTOMATED)),
  ...getCards(byType(CardType.ACTIVE)),
  ...getCards(byType(CardType.EVENT)),
  ...getCards(byType(CardType.CEO)),
].map(toName)
  .sort((a, b) => a.localeCompare(b));

/** The most suggestions shown at once. */
const MAX_SEARCH_MATCHES = 10;

type CardsFilterModel = {
  selectedCards: Array<CardName>;
  searchTerm: string;
  activeIndex: number;
}

type Refs = {
  filter: HTMLInputElement;
};

export default defineComponent({
  name: 'CardsFilter',
  emits: ['cards-list-changed', 'close'],
  setup() {
    const controls = useCreateControls();
    return {inputHost: createInputHosts(), presentation: computed(() => controls.value?.cardsFilter)};
  },
  props: {
    title: {
      type: String,
      required: true,
    },
    hint: {
      type: String,
      required: true,
    },
    /** Cards selected when the popup opens. */
    selected: {
      type: Array as () => ReadonlyArray<CardName>,
      default: () => [],
    },
  },
  data(): CardsFilterModel {
    return {
      selectedCards: [...this.selected],
      searchTerm: '',
      activeIndex: 0,
    };
  },
  components: {
    AppButton, InputPortal, PresentationHost, PopupPanel,
  },
  computed: {
    /** Up to MAX_SEARCH_MATCHES unselected cards whose names contain the search term. */
    searchMatches(): Array<CardName> {
      if (this.searchTerm === '') {
        return [];
      }
      const searchTermLowercase = this.searchTerm.toLowerCase();
      const matches: Array<CardName> = [];
      for (const candidate of ALL_CARDS) {
        if (this.selectedCards.includes(candidate)) {
          continue;
        }
        if (candidate.toLowerCase().indexOf(searchTermLowercase) >= 0) {
          matches.push(candidate);
        }
        if (matches.length === MAX_SEARCH_MATCHES) {
          break;
        }
      }
      return matches;
    },
    presentationBinding(): CardsFilterBinding {
      return {title: this.title, inputHost: this.inputHost, selected: this.selectedCards, searchMatches: this.searchMatches,
        activeCard: this.searchMatches[this.activeIndex],
        highlight: (name) => {
          const index = this.searchMatches.indexOf(name);
          if (index >= 0) {
            this.activeIndex = index;
          }
        },
        add: (name) => {
          if (this.searchMatches.includes(name)) {
            this.addCard(name);
          }
        },
        remove: this.removeCard};
    },
    typedRefs(): Refs {
      return this.$refs as unknown as Refs;
    },
  },
  methods: {
    onFilterKeydown(event: KeyboardEvent) {
      const count = this.searchMatches.length;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (count > 0) {
          const step = event.key === 'ArrowDown' ? 1 : -1;
          this.activeIndex = (this.activeIndex + step + count) % count;
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const activeCard = this.searchMatches[this.activeIndex];
        if (activeCard !== undefined) {
          this.addCard(activeCard);
        }
      }
    },
    isPrelude(cardName: CardName) {
      return getCard(cardName)?.type === CardType.PRELUDE;
    },
    isCEO(cardName: CardName) {
      return getCard(cardName)?.type === CardType.CEO;
    },
    expansions(cardName: CardName): Array<Expansion> {
      return getCard(cardName)?.compatibility ?? [];
    },
    removeCard(cardName: CardName) {
      inplaceRemove(this.selectedCards, cardName);
    },
    addCard(cardName: CardName) {
      if (this.selectedCards.includes(cardName)) {
        return;
      }
      this.selectedCards.push(cardName);
      this.selectedCards.sort();
      this.searchTerm = '';
      this.typedRefs.filter.focus();
    },
  },
  watch: {
    selectedCards: {
      handler(value) {
        this.$emit('cards-list-changed', value);
      },
      deep: true,
    },
    searchMatches() {
      this.activeIndex = 0;
    },
    searchTerm(value: string) {
      // Allows multiple simultaneous entries
      // This is case sensitive, as opposed to the standard search
      if (value.indexOf(',') !== -1) {
        const cardNames = new Set(value.split(',').map((c) => c.trim()));
        for (const item of ALL_CARDS) {
          if (cardNames.has(item)) {
            this.addCard(item);
          }
        }
      }
    },
  },
  mounted() {
    this.typedRefs.filter.focus();
  },
});
</script>
