<template>
  <div v-if="dialog" class="ai-decision-dialog" data-test="ai-decision-dialog" @click.self="close">
    <div class="ai-decision-dialog__box" role="dialog" aria-modal="true" aria-labelledby="ai-decision-title">
      <h2 id="ai-decision-title" v-i18n>Rate the AI decision</h2>
      <div v-if="dialog.targets.length > 1" class="ai-decision-dialog__nav">
        <button type="button" class="btn" :disabled="position <= 0" data-test="ai-prev" @click="step(-1)" v-i18n>Previous</button>
        <span class="ai-decision-dialog__counter">{{ position + 1 }} / {{ dialog.targets.length }}</span>
        <button type="button" class="btn" :disabled="position >= dialog.targets.length - 1" data-test="ai-next" @click="step(1)" v-i18n>Next</button>
      </div>
      <div class="ai-decision-dialog__line" data-test="ai-decision-line">
        <span class="ai-decision-dialog__color" :class="'player_bg_color_' + dialog.target.color">{{ colorName }}</span>
        <span>{{ lineText }}</span>
      </div>
      <div v-if="cardOptions.length > 0" class="ai-decision-dialog__cards" data-test="ai-decision-cards">
        <div v-for="option in cardOptions" :key="option.index"
          :class="['ai-decision-dialog__card', {'ai-decision-dialog__card--chosen': option.chosen === true}]">
          <Card :card="cardModel(option.card)" />
          <span class="ai-decision-dialog__value">{{ option.chosen === true ? '✓ ' : '' }}{{ formatValue(option.value) }}</span>
        </div>
      </div>
      <ol v-if="dialog.decision" class="ai-decision-dialog__options" data-test="ai-decision-options">
        <li v-for="option in listOptions" :key="option.index"
          :class="['ai-decision-dialog__option', {'ai-decision-dialog__option--chosen': option.chosen === true}]">
          <span class="ai-decision-dialog__mark">{{ option.chosen === true ? '✓' : '' }}</span>
          <span class="ai-decision-dialog__label">{{ optionLabel(option) }}</span>
          <span v-if="option.value !== undefined" class="ai-decision-dialog__value">{{ formatValue(option.value) }}</span>
        </li>
      </ol>
      <div class="ai-decision-dialog__ratings" data-test="ai-decision-ratings">
        <button v-for="choice in AI_RATING_CHOICES" :key="choice.rating" type="button"
          class="btn ai-decision-dialog__rating"
          :class="{'ai-decision-dialog__rating--picked': rating === choice.rating}"
          :data-test="'ai-rating-' + choice.rating"
          @click="rating = choice.rating">
          {{ AI_FEEDBACK_EMOJI[choice.rating] }} {{ choice.label }}
        </button>
      </div>
      <label v-if="canNameBetterOption(rating)" class="ai-decision-dialog__field">
        <span v-i18n>Better option</span>
        <select v-model="betterOptionIndex" class="form-select" data-test="ai-better-option">
          <option :value="undefined"></option>
          <option v-for="option in dialog.decision?.options ?? []" :key="option.index" :value="option.index">{{ optionLabel(option) }}</option>
        </select>
      </label>
      <label class="ai-decision-dialog__field">
        <span v-i18n>Comment (optional)</span>
        <textarea v-model="text" class="form-input" :maxlength="MAX_AI_FEEDBACK_TEXT" rows="2" data-test="ai-feedback-text"></textarea>
      </label>
      <p v-if="aiFeedbackState.error" class="ai-decision-dialog__error" data-test="ai-feedback-error">{{ aiFeedbackState.error }}</p>
      <ul v-if="existingRatings.length > 0" class="ai-decision-dialog__existing" data-test="ai-existing-ratings">
        <li v-for="entry in existingRatings" :key="entry.name + entry.at">
          {{ AI_FEEDBACK_EMOJI[entry.rating] }} {{ entry.name }}<template v-if="entry.text">: {{ entry.text }}</template>
        </li>
      </ul>
      <div class="ai-decision-dialog__actions">
        <button type="button" class="btn btn-primary" :disabled="rating === undefined || saving" data-test="ai-save" @click="save" v-i18n>Save</button>
        <button type="button" class="btn" :disabled="saving" data-test="ai-remove" @click="removeRating" v-i18n>Remove my rating</button>
        <button type="button" class="btn" data-test="ai-close" @click="close" v-i18n>Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {AI_FEEDBACK_EMOJI, canNameBetterOption, AiFeedbackRating, MAX_AI_FEEDBACK_TEXT} from '@/common/ai/AiFeedback';
import {CardName} from '@/common/cards/CardName';
import {Log} from '@/common/logs/Log';
import {translateText} from '@/client/directives/i18n';
import Card from '@/client/components/card/Card.vue';
import {logCardModel} from '@/client/components/logpanel/logCardModel';
import {aiFeedbackState, closeAiDecision, openAiDecisionIndex, ratingsOf, saveAiFeedback, stepAiDecision} from './aiFeedbackState';
import {formatValue, optionCard, optionLabel} from './aiDecisionOptions';
import {AI_RATING_CHOICES} from './aiRatingChoices';

const dialog = computed(() => aiFeedbackState.dialog);
const rating = ref<AiFeedbackRating | undefined>(aiFeedbackState.dialog?.rating);
const betterOptionIndex = ref<number | undefined>(undefined);
const text = ref('');
const saving = ref(false);

const colorName = computed(() => translateText(dialog.value?.target.color ?? '') ?? dialog.value?.target.color ?? '');
const lineText = computed(() => {
  const message = dialog.value?.target.message;
  return message === undefined ? '' : Log.applyData(message, (datum) => datum.value?.toString() ?? '');
});
const existingRatings = computed(() => dialog.value === undefined ? [] : ratingsOf(dialog.value.target.messageId));
// The dialog component stays mounted between openings: take the preselected rating of the new row
watch(dialog, (next) => {
  rating.value = next?.rating;
  betterOptionIndex.value = undefined;
  text.value = '';
});
const position = computed(() => openAiDecisionIndex());
const cardOptions = computed(() => (dialog.value?.decision?.options ?? []).filter((option) => optionCard(option) !== undefined));
const listOptions = computed(() => (dialog.value?.decision?.options ?? []).filter((option) => optionCard(option) === undefined));

function cardModel(name: string | undefined) {
  return logCardModel(name as CardName, dialog.value?.viewModel.players ?? []);
}

function step(delta: -1 | 1): void {
  stepAiDecision(delta);
  rating.value = undefined;
  betterOptionIndex.value = undefined;
  text.value = '';
}

async function save(): Promise<void> {
  const current = dialog.value;
  const participantId = aiFeedbackState.participantId ?? current?.viewModel.id;
  if (current === undefined || participantId === undefined || rating.value === undefined) {
    return;
  }
  saving.value = true;
  try {
    await saveAiFeedback(participantId, {
      messageId: current.target.messageId,
      rating: rating.value,
      text: text.value,
      betterOptionIndex: betterOptionIndex.value,
    });
  } catch (e) {
    aiFeedbackState.error = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

async function removeRating(): Promise<void> {
  const current = dialog.value;
  const participantId = aiFeedbackState.participantId ?? current?.viewModel.id;
  if (current === undefined || participantId === undefined) {
    return;
  }
  saving.value = true;
  try {
    await saveAiFeedback(participantId, {messageId: current.target.messageId});
  } catch (e) {
    aiFeedbackState.error = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

function close(): void {
  closeAiDecision();
}
</script>

<style lang="less" scoped>
.ai-decision-dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);

  &__box {
    width: min(640px, 92vw);
    max-height: 86vh;
    overflow-y: auto;
    padding: 20px;
    border-radius: 6px;
    background: #2b2b2b;
    color: #eee;
  }

  &__line {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 8px 0 12px;
  }

  &__color {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
  }

  &__options {
    margin: 0 0 12px;
    padding-left: 0;
    list-style: none;
  }

  &__option {
    display: flex;
    gap: 8px;
    padding: 3px 6px;

    &--chosen {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
    }
  }

  &__mark {
    width: 14px;
  }

  &__value {
    margin-left: auto;
    color: #9fd6a0;
  }

  &__ratings {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__rating--picked {
    outline: 2px solid #7cc6ff;
  }

  &__field {
    display: block;
    margin-bottom: 10px;
  }

  &__error {
    color: #ff8080;
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
}
</style>

<style lang="less" scoped>
.ai-decision-dialog__nav {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 4px 0 10px;
}

.ai-decision-dialog__counter {
  font-size: 12px;
  color: #bbb;
}

.ai-decision-dialog__cards {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 10px;
}

.ai-decision-dialog__card {
  flex: 0 0 150px;
  text-align: center;

  &--chosen {
    outline: 2px solid #7cc6ff;
    border-radius: 4px;
  }
}
</style>
