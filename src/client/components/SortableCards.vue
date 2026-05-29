<template>
<div>
  <div class="sortable-cards">
    <div
      ref="cardbox"
      v-for="card in getSortedCards()"
      :key="card.name"
      class="cardbox"
      :class="{ 'dragging': Boolean(dragCard) }"
      draggable="true"
      @dragend="onDragEnd()"
      @dragstart="onDragStart(card.name)"
      @dragover.prevent="onDragHover(card.name)"
    >
      <Card :card="card"/>
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

type DataModel = {
  /** Mapping from card name to its order */
  cardOrder: {[x: string]: number};
  /** When defined, it is the name of the card being dragged. */
  dragCard: CardName | undefined;
  /** Last card hover already handled during this drag operation. */
  lastDragHoverCard: CardName | undefined;
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
      cardOrder: cardOrder,
      dragCard: undefined,
      lastDragHoverCard: undefined,
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
      this.lastDragHoverCard = undefined;
    },
    onDragEnd(): void {
      this.dragCard = undefined;
      this.lastDragHoverCard = undefined;
    },
    onDragHover(source: CardName): void {
      if (this.dragCard === undefined || source === this.dragCard || source === this.lastDragHoverCard) {
        return;
      }
      const orderedCardNames = this.getSortedCards().map((card) => card.name);
      const dragIndex = orderedCardNames.indexOf(this.dragCard);
      const hoverIndex = orderedCardNames.indexOf(source);
      if (dragIndex === -1 || hoverIndex === -1) {
        return;
      }
      orderedCardNames.splice(dragIndex, 1);
      orderedCardNames.splice(hoverIndex, 0, this.dragCard);
      orderedCardNames.forEach((cardName, idx) => {
        this.cardOrder[cardName] = idx + 1;
      });
      this.lastDragHoverCard = source;
      CardOrderStorage.updateCardOrder(this.playerId, this.cardOrder);
    },
  },
});
</script>
