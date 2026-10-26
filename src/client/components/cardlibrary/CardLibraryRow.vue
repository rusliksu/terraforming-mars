<template>
  <div class="card-library-row">
    <div class="card-library-row-preview">
      <div class="cardbox">
        <Card :card="cardModel" auto-tall/>
      </div>
    </div>

    <div class="card-library-row-body">
      <div class="card-library-row-tags">
        <span class="card-library-tag" :class="'card-library-tag--' + entry.status">{{ entry.status }}</span>
        <span v-if="needsBehavior" class="card-library-tag card-library-tag--needs-behavior">no curated effect</span>
      </div>
      <p v-if="entry.definition.effectDescription" class="card-library-row-effect-description">{{ entry.definition.effectDescription }}</p>
      <p v-if="entry.submittedBy" class="card-library-row-submitter">
        <span v-i18n>Submitted by</span>: {{ entry.submittedBy }}
      </p>

      <div v-if="!previewOnly" class="card-library-row-actions">
        <button type="button" class="btn" @click="copyCode" v-i18n>{{ copyButtonLabel }}</button>
        <template v-if="isAdmin">
          <button
            v-if="entry.status === 'submitted'"
            type="button"
            class="btn"
            :disabled="needsBehavior"
            :title="needsBehavior ? 'Attach an effect below before approving' : ''"
            @click="$emit('approve', entry.id)"
            v-i18n
          >
            Approve
          </button>
          <button type="button" class="btn btn-error" @click="$emit('delete', entry.id)" v-i18n>Delete</button>
        </template>
      </div>

      <details v-if="isAdmin" class="card-library-row-behavior">
        <summary v-i18n>Admin: set effect (raw JSON)</summary>
        <textarea v-model="behaviorJson" rows="4" placeholder='{"production": {"megacredits": 1}}'></textarea>
        <div class="card-library-row-behavior-actions">
          <button type="button" class="btn" @click="submitBehavior" v-i18n>Attach effect</button>
          <span v-if="behaviorError" class="card-library-row-error">{{ behaviorError }}</span>
        </div>
      </details>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import Card from '@/client/components/card/Card.vue';
import {CustomCardLibraryEntry} from '@/common/cards/CustomCardLibraryEntry';
import {CardModel} from '@/common/models/CardModel';
import {definitionToCardModel} from '@/client/utils/customCardPreview';

type DataModel = {
  copied: boolean;
  behaviorJson: string;
  behaviorError: string;
};

export default defineComponent({
  name: 'CardLibraryRow',
  components: {Card},
  props: {
    entry: {type: Object as PropType<CustomCardLibraryEntry>, required: true},
    isAdmin: {type: Boolean, default: false},
    // CardMaker.vue-style "here's how it'll look" preview: not a real, submitted entry, so
    // Copy code/Approve/Delete would all be either meaningless or destructive mid-submission.
    previewOnly: {type: Boolean, default: false},
  },
  emits: ['approve', 'delete', 'set-behavior'],
  data(): DataModel {
    return {copied: false, behaviorJson: '', behaviorError: ''};
  },
  computed: {
    cardModel(): CardModel {
      return definitionToCardModel(this.entry.definition);
    },
    needsBehavior(): boolean {
      return this.entry.definition.behavior === undefined;
    },
    copyButtonLabel(): string {
      return this.copied ? 'Copied!' : 'Copy code';
    },
  },
  methods: {
    async copyCode(): Promise<void> {
      try {
        await navigator.clipboard?.writeText(this.entry.shareCode);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 1500);
      } catch (e) {
        // Clipboard access may be unavailable/denied; nothing more we can do here.
      }
    },
    submitBehavior(): void {
      this.behaviorError = '';
      let behavior: unknown;
      try {
        behavior = JSON.parse(this.behaviorJson);
      } catch (e) {
        this.behaviorError = 'Invalid JSON.';
        return;
      }
      this.$emit('set-behavior', this.entry.id, behavior);
    },
  },
});
</script>

<style scoped lang="less">
.card-library-row {
  display: flex;
  flex-direction: column;
  border: 1px solid #444;
  border-radius: 8px;
  overflow: hidden;
  background: #201d2b;
  color: #ddd;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
.card-library-row-preview {
  display: flex;
  justify-content: center;
  padding: 14px;
  background: #15131f;
}
.card-library-row-body {
  flex: 1;
  min-width: 0;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-library-row-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.card-library-tag {
  font-size: 10px;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  background: #444;
  &--submitted { background: #b8860b; }
  &--approved { background: #2e7d32; }
  &--needs-behavior { background: #7a2323; }
}
.card-library-row-effect-description {
  margin: 0;
  font-size: 12px;
  color: #cfc9e6;
}
.card-library-row-submitter {
  margin: 0;
  font-size: 11px;
  color: #999;
}
.card-library-row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 6px;
}
.card-library-row-behavior {
  margin-top: 6px;
  font-size: 11px;
  color: #999;

  textarea {
    width: 100%;
    box-sizing: border-box;
    margin-top: 6px;
    font-family: monospace;
    font-size: 11px;
  }
}
.card-library-row-behavior-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.card-library-row-error {
  color: #e74c3c;
}
</style>
