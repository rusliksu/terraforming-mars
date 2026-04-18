<template>
<div>
  <div class="sortable-cards">
    <div
      ref="cardbox"
      v-for="(card, index) in getSortedCards()"
      :key="card.name"
      class="cardbox"
      :class="{ 'dragging': Boolean(dragCard) }"
      draggable="true"
      @click="clickMethod"
      @dragend="onDragEnd()"
      @dragstart="onDragStart(card.name)"
      @dragover.prevent="onDragHover(card.name)"
    >
      <Card :card="card"/>
      <div v-if="showReorder" class="reorder-banners-container">
        <div class="reorder-banners-left" v-if="index > 0"></div>
        <div class="reorder-banners-right" v-if="index < cards.length - 1"></div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import {defineComponent} from '@/client/vue3-compat';
import Card from '@/client/components/card/Card.vue';
import {CardName} from '@/common/cards/CardName';
import {CardModel} from '@/common/models/CardModel';
import {CardOrderStorage} from '@/client/utils/CardOrderStorage';
import {getPreferences} from '@/client/utils/PreferencesManager';

type DataModel = {
  /** When true use the point-and-click reorder UI */
  showReorder: boolean;
  /** Mapping from card name to its order */
  cardOrder: {[x: string]: number};
  /** When defined, it is the name of the card being dragged. */
  dragCard: CardName | undefined;
};

export default defineComponent({
  name: 'SortableCards',
  components: {
    Card,
  },
  props: {
    cards: {
      type: Array as () => Array<CardModel>,
      required: true,
    },
    playerId: {
      type: String,
      required: true,
    },
  },
  data(): DataModel {
    const cache = CardOrderStorage.getCardOrder(this.playerId);
    const cardOrder: {[x: string]: number} = {};
    const keys = Object.keys(cache);
    let max = 0;
    for (const key of keys) {
      if (this.cards.find((card) => card.name === key) !== undefined) {
        cardOrder[key] = cache[key];
        max = Math.max(max, cache[key]);
      }
    }
    max++;
    for (const card of this.cards) {
      if (cardOrder[card.name] === undefined) {
        cardOrder[card.name] = max++;
      }
    }
    return {
      showReorder: getPreferences().experimental_ui,
      cardOrder: cardOrder,
      dragCard: undefined,
    };
  },
  methods: {
    getSortedCards() {
      return CardOrderStorage.getOrdered(
        this.cardOrder,
        this.cards,
      );
    },
    onDragStart(source: CardName): void {
      this.dragCard = source;
    },
    onDragEnd(): void {
      this.dragCard = undefined;
    },
    onDragHover(source: CardName): void {
      if (this.dragCard === undefined || source === this.dragCard) {
        return;
      }
      const temp = this.cardOrder[source];
      this.cardOrder[source] = this.cardOrder[this.dragCard];
      this.cardOrder[this.dragCard] = temp;
      CardOrderStorage.updateCardOrder(this.playerId, this.cardOrder);
    },
    clickMethod(e: MouseEvent) {
      if (!this.showReorder) return;
      const target = e.currentTarget as HTMLElement;
      if (!target) return;
      if (target.matches('.sortable-cards *')) {
        const rect = target.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const direction = x <= 0.25 ? -1.5 : x >= 0.75 ? 1.5 : null;
        if (direction) {
          const cardTitle = target.querySelector('.card-title');
          if (cardTitle) {
            const textContent = cardTitle.textContent;
            if (textContent) {
              const thisCard = textContent.trim();
              this.cardOrder[thisCard] += direction;
              Object.entries(this.cardOrder)
                .sort((a, b) => a[1]-b[1])
                .forEach((entry, i) => {
                  this.cardOrder[entry[0]] = i+1;
                });
              CardOrderStorage.updateCardOrder(this.playerId, this.cardOrder);
            }
          }
        }
      }
    },
  },
});
</script>
