<template>
  <main class="card-maker">
    <header class="card-maker-header">
      <a href="/">← Home</a>
      <h1>Card maker</h1>
      <p>Compose a card and see it in the game's card layout. This draft is visual only and cannot be played in a game yet.</p>
    </header>

    <div class="card-maker-layout">
      <section class="card-maker-panel" aria-label="Card editor">
        <h2>Card details</h2>
        <div class="card-maker-fields">
          <label>
            Name
            <input v-model="draft.name" maxlength="80" placeholder="New project card" >
          </label>
          <label>
            Type
            <select v-model="draft.type">
              <option v-for="type in CARD_TYPES" :key="type" :value="type">{{ typeLabels[type] }}</option>
            </select>
          </label>
          <label>
            Cost (M€)
            <input v-model.number="draft.cost" type="number" min="0" max="100" @change="normalizeNumber('cost', 0, 100)" >
          </label>
          <label>
            Victory points
            <input v-model.number="draft.victoryPoints" type="number" min="-10" max="20" @change="normalizeNumber('victoryPoints', -10, 20)" >
          </label>
        </div>

        <fieldset>
          <legend>Tags (up to {{ maxTags }})</legend>
          <div class="card-maker-tags">
            <label v-for="tag in CARD_TAGS" :key="tag">
              <input type="checkbox" :checked="draft.tags.includes(tag)" :disabled="!draft.tags.includes(tag) && draft.tags.length >= maxTags" @change="toggleTag(tag)" >
              {{ tag }}
            </label>
          </div>
        </fieldset>

        <div class="card-maker-fields">
          <label>
            Preview icon
            <select v-model="draft.iconType">
              <option value="">None</option>
              <option v-for="icon in ICON_TYPES" :key="icon" :value="icon">{{ icon }}</option>
            </select>
          </label>
          <label>
            Icon amount
            <input v-model.number="draft.iconAmount" type="number" min="1" max="30" :disabled="draft.iconType === ''" @change="normalizeNumber('iconAmount', 1, 30)" >
          </label>
        </div>
        <label class="card-maker-description">
          Card text
          <textarea v-model="draft.description" maxlength="400" rows="3" placeholder="What does this card do?" ></textarea>
        </label>
        <button type="button" class="card-maker-reset" @click="resetDraft">New blank card</button>
      </section>

      <aside class="card-maker-preview" aria-label="Card preview">
        <h2>Live preview</h2>
        <Card :card="cardModel" :previewCard="clientCard" :autoTall="true" />
        <p>Appearance only. The icon and text do not create game effects.</p>
      </aside>
    </div>

    <section class="card-maker-panel card-maker-code" aria-label="Card code">
      <h2>Draft JSON</h2>
      <p>Copy this code to keep or share the draft. It stays in your browser until you copy it.</p>
      <textarea :value="exportCode" readonly rows="11" aria-label="Export card JSON" ></textarea>
      <label>
        Load a draft JSON
        <textarea v-model="importCode" rows="5" aria-label="Import card JSON" ></textarea>
      </label>
      <button type="button" @click="loadDraft">Load JSON</button>
      <p v-if="importError" class="card-maker-error" role="alert">{{ importError }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import Card from '@/client/components/card/Card.vue';
import {CardType} from '@/common/cards/CardType';
import {CARD_TAGS, CARD_TYPES, CardDraft, ICON_TYPES, newCardDraft, parseCardDraft, previewCard} from './CardDraft';

const draft = ref<CardDraft>(newCardDraft());
const importCode = ref('');
const importError = ref('');
const previousViewport = ref('');
const typeLabels = {
  [CardType.AUTOMATED]: 'Automated',
  [CardType.ACTIVE]: 'Active',
  [CardType.EVENT]: 'Event',
};

const maxTags = computed(() => draft.value.type === CardType.EVENT ? 3 : 4);
const clientCard = computed(() => previewCard(draft.value));
const cardModel = computed(() => ({name: clientCard.value.name}));
const exportCode = computed(() => JSON.stringify(draft.value, null, 2));

onMounted(() => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport !== null) {
    previousViewport.value = viewport.getAttribute('content') ?? '';
    viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
  }
});

onBeforeUnmount(() => {
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', previousViewport.value);
});

watch(() => draft.value.type, () => {
  draft.value.tags = draft.value.tags.slice(0, maxTags.value);
});

function toggleTag(tag: CardDraft['tags'][number]) {
  const index = draft.value.tags.indexOf(tag);
  if (index >= 0) {
    draft.value.tags.splice(index, 1);
  } else if (draft.value.tags.length < maxTags.value) {
    draft.value.tags.push(tag);
  }
}

function normalizeNumber(field: 'cost' | 'victoryPoints' | 'iconAmount', min: number, max: number) {
  const value = Number(draft.value[field]);
  draft.value[field] = Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min;
}

function resetDraft() {
  draft.value = newCardDraft();
  importError.value = '';
}

function loadDraft() {
  try {
    draft.value = parseCardDraft(importCode.value);
    importError.value = '';
  } catch (error) {
    importError.value = error instanceof SyntaxError ? 'Invalid JSON.' :
      error instanceof Error ? error.message : 'Could not load this card code.';
  }
}
</script>

<style scoped>
.card-maker {
  box-sizing: border-box;
  max-width: 1150px;
  margin: 0 auto;
  padding: 28px 24px 70px;
  color: #f2f4f8;
}

.card-maker-header { margin-bottom: 24px; }
.card-maker-header a { color: #bdddf5; }
.card-maker-header h1 { margin: 12px 0 8px; }
.card-maker-header p, .card-maker-preview p, .card-maker-code p { color: #ccd3df; }
.card-maker-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; align-items: start; }
.card-maker-panel, .card-maker-preview { background: #283341; border: 1px solid #536173; border-radius: 12px; padding: 20px; }
.card-maker-panel h2, .card-maker-preview h2 { margin-top: 0; }
.card-maker-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.card-maker label { display: flex; flex-direction: column; gap: 6px; font-weight: 600; }
.card-maker input, .card-maker select, .card-maker textarea { box-sizing: border-box; width: 100%; padding: 8px 10px; border: 1px solid #8b97a8; border-radius: 5px; color: #15202b; background: white; font: inherit; }
.card-maker textarea { resize: vertical; }
.card-maker fieldset { margin: 20px 0; border: 1px solid #647285; border-radius: 6px; }
.card-maker legend { padding: 0 6px; font-weight: 600; }
.card-maker-tags { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.card-maker-tags label { flex-direction: row; align-items: center; font-weight: normal; }
.card-maker-tags input { width: auto; margin: 0; }
.card-maker-description { margin-top: 20px; }
.card-maker button { margin-top: 14px; padding: 9px 14px; border: 0; border-radius: 5px; background: #d8a52b; color: #1d2430; font-weight: 700; cursor: pointer; }
.card-maker button:hover { background: #f0c456; }
.card-maker-preview { position: sticky; top: 20px; }
.card-maker-preview :deep(.card-container) { margin: 8px auto 18px; }
.card-maker-code { margin-top: 24px; }
.card-maker-code textarea { font-family: Consolas, monospace; font-size: 13px; }
.card-maker-code label { margin-top: 18px; }
.card-maker-error { color: #ffaaa5; }

@media (max-width: 800px) {
  .card-maker-layout { grid-template-columns: 1fr; }
  .card-maker-preview { position: static; }
  .card-maker-fields { grid-template-columns: 1fr; }
  .card-maker-tags { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
