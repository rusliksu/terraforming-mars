<template>
<div>
  <div class="sortable-cards">
    <div ref="draggers" :class="{ 'dragging': Boolean(dragCard) }" v-for="(card, index) in getSortedCards()" :key="card.name" draggable="true" @dragend="onDragEnd()" @dragstart="onDragStart(card.name)" @dragover="onDragOver(card.name, $event)">
      <div v-if="dragCard" ref="droppers" class="drop-target" @dragover="onDragOver(card.name, $event)"></div>
      <div ref="cardbox" class="cardbox" @click="clickMethod">
        <Card :card="card"/>
        <div v-if="showReorder" class="reorder-banners-container">
          <div class="reorder-banners-left" v-if="index > 0"></div>
          <div class="reorder-banners-right" v-if="index < cards.length - 1"></div>
        </div>
      </div>
    </div>
    <div v-if="dragCard" ref="dropend" class="drop-target" @dragover="onDragOver('end')"></div>
  </div>
</div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import Card from '@/client/components/card/Card.vue';
import {CardName} from '@/common/cards/CardName';
import {CardModel} from '@/common/models/CardModel';
import {CardOrderStorage} from '@/client/utils/CardOrderStorage';

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
      showReorder: false,
      cardOrder: cardOrder,
      dragCard: undefined,
    };
  },
  methods: {
    getSortedCards() {
      const cardNames = new Set<CardName>();
      const uniqueCards = this.cards.filter((card) => {
        if (cardNames.has(card.name)) {
          return false;
        }
        cardNames.add(card.name);
        return true;
      });
      return CardOrderStorage.getOrdered(
        this.cardOrder,
        uniqueCards,
      );
    },
    onDragStart(source: CardName): void {
      this.dragCard = source;
    },
    onDragEnd(): void {
      this.dragCard = undefined;
    },
    onDragOver(source: CardName | 'end', event?: DragEvent): void {
      if (this.dragCard === undefined || source === this.dragCard) {
        return;
      }

      const ordered = Object.keys(this.cardOrder)
        .filter((name) => name !== this.dragCard)
        .sort((a, b) => this.cardOrder[a] - this.cardOrder[b]);

      let insertIndex = ordered.length;
      if (source !== 'end') {
        insertIndex = ordered.indexOf(source);
        if (this.cardOrder[this.dragCard] < this.cardOrder[source]) {
          let insertAfter = true;
          const target = event?.currentTarget;
          if (target instanceof HTMLElement && typeof event?.clientX === 'number' && event.clientX > 0) {
            const rect = target.getBoundingClientRect();
            insertAfter = event.clientX >= rect.left + rect.width / 2;
          }
          if (insertAfter) {
            insertIndex++;
          }
        }
      }

      ordered.splice(insertIndex, 0, this.dragCard);
      ordered.forEach((name, index) => {
        this.cardOrder[name] = index + 1;
      });
      CardOrderStorage.updateCardOrder(this.playerId, this.cardOrder);
    },
    doNotDragAndDropOnReorder() {
      return this.showReorder ? 'do-not-drag-and-drop' : '';
    },
    clickMethod(e: MouseEvent) {
      if (!this.showReorder) {
        return;
      }
      const target = e.currentTarget as HTMLElement;
      if (!target) {
        return;
      }
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
